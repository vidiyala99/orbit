"""The seeded demo account behind POST /auth/demo-login.

Everything here is check-then-create against fixed emails/names/details, so the
endpoint can be hit any number of times across any number of demos without
duplicating a user, a plan, a room or a message. Time-boxed rows (plans, the
open proposal) are moved forward on each call instead, so the demo is always
"live now" rather than an archive of the first time it ran.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .embeddings import generate_bio_embedding
from .models import (
    Plan,
    Presence,
    Room,
    RoomMember,
    RoomMessage,
    TimeProposal,
    TimeProposalConfirmation,
    User,
)
from .routers.plans import _assemble_plan_text, _snap

# expiry margin so a demo run doesn't fall over an actual boundary mid-click.
PRESENCE_TTL = timedelta(hours=2)

DEMO_EMAIL = "demo@stayconnected.app"
DEMO_CITY = "Mountain View, CA"
# Same fallback location the frontend uses when geolocation is unavailable.
DEMO_LAT = 37.3861
DEMO_LON = -122.0839

# Fellow demo residents. They exist so member counts, plan authorship and
# partial confirmations look like a real neighborhood rather than an empty one.
COMPANIONS = [
    (0, "demo-priya@stayconnected.app", "Priya", "Raman", "Working in a cafe"),
    (1, "demo-marcus@stayconnected.app", "Marcus", "Ellis", "At a hackathon"),
    (2, "demo-jules@stayconnected.app", "Jules", "Okada", "Just exploring"),
]

# For the in-venue matching demo: real bios/tags for the demo user and its
# companions, so toggling Presence has an actual field of candidates to rank
# instead of an empty room. Priya's bio deliberately echoes the demo user's
# ("AI", "seed") so she ranks above Marcus on bio_embedding similarity.
DEMO_BIO = "Building an AI platform for small-business networking, pre-seed."
DEMO_INTENT_TAGS = ["co_founder", "investors"]
COMPANION_BIOS = {
    "demo-priya@stayconnected.app": (
        "Healthcare AI startup, raising a seed round, looking for a technical co-founder.",
        ["co_founder", "customers"],
    ),
    "demo-marcus@stayconnected.app": (
        "Angel investor, mostly SaaS and marketplaces, ex-VP Sales at a fintech.",
        ["investors"],
    ),
    "demo-jules@stayconnected.app": (
        "Designer wandering new cities, always down for a walk or a gallery.",
        ["friends"],
    ),
}

# owner: 0 = the demo user, 1 = Priya, 2 = Marcus.
# lat_off / lon_off are relative to the chosen city so a NYC pick still
# has live events within the nearby radius.
PLAN_SEEDS = [
    {
        "owner": 0, "activity": "cowork", "openness": "open_to_chat",
        "detail": "Red Rock Coffee, upstairs by the window.",
        "lat_off": 0, "lon_off": 0,
        "starts_in": -20, "minutes": 150,
    },
    {
        "owner": 1, "activity": "coffee", "openness": "actively_meeting",
        "detail": "Philz on Castro — happy to talk job hunt.",
        "lat_off": 0.004, "lon_off": -0.005,
        "starts_in": -5, "minutes": 90,
    },
    {
        "owner": 2, "activity": "meal", "openness": "heads_down",
        "detail": "Lunch at the Caltrain plaza, laptop open.",
        "lat_off": -0.006, "lon_off": 0.003,
        "starts_in": 15, "minutes": 60,
    },
    {
        "owner": 0, "activity": "event", "openness": "actively_meeting",
        "detail": "AI / startup hack table — looking for a technical co-founder.",
        "lat_off": 0.003, "lon_off": 0.001,
        "starts_in": -10, "minutes": 180,
    },
    {
        "owner": 1, "activity": "event", "openness": "open_to_chat",
        "detail": "Figma design critique at the cowork loft.",
        "lat_off": 0.005, "lon_off": -0.002,
        "starts_in": -15, "minutes": 120,
    },
    {
        "owner": 2, "activity": "event", "openness": "open_to_chat",
        "detail": "Vinyl listening hour — bring one record.",
        "lat_off": -0.003, "lon_off": -0.004,
        "starts_in": 20, "minutes": 90,
    },
    {
        "owner": 1, "activity": "event", "openness": "actively_meeting",
        "detail": "Lunch run from Castro, easy 5k.",
        "lat_off": 0.001, "lon_off": 0.004,
        "starts_in": 30, "minutes": 75,
    },
    {
        "owner": 0, "activity": "event", "openness": "open_to_chat",
        "detail": "Walk the bay trail after work.",
        "lat_off": -0.004, "lon_off": 0.005,
        "starts_in": 45, "minutes": 90,
    },
]

CHATTY_ROOM = "Peninsula Regulars"

ROOM_SEEDS = [
    {"name": CHATTY_ROOM, "purpose": "cowork", "visibility": "public",
     "lat_off": 0, "lon_off": 0, "members": [1, 2]},
    {"name": "Founders Cowork Wednesdays", "purpose": "cowork", "visibility": "public",
     "lat_off": 0.002, "lon_off": 0.002, "members": [2]},
    {"name": "Job Hunt Support Circle", "purpose": "job_hunting", "visibility": "private",
     "lat_off": None, "lon_off": None, "members": [1]},
    {"name": "Design critique Thursdays", "purpose": "other", "visibility": "public",
     "lat_off": 0.003, "lon_off": -0.001, "members": [1]},
    {"name": "Pickup soccer + music after", "purpose": "other", "visibility": "public",
     "lat_off": -0.002, "lon_off": 0.003, "members": [2]},
]

# (sender, body) — the prose around the two cards in the chatty room.
CHAT_SEEDS = [
    (1, "Morning! I'm at Red Rock till about noon if anyone wants to join."),
    (0, "On my way — grabbing the big table upstairs."),
    (2, "Can't make this morning, but I'm around after lunch."),
]


def _get_or_create_user(
    db: Session, email: str, first: str, last: str, *,
    headline: str | None = None,
    lat: float = DEMO_LAT, lon: float = DEMO_LON, city: str = DEMO_CITY,
) -> User:
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is None:
        user = User(email=email)
        db.add(user)
    now = datetime.now(timezone.utc)
    user.first_name = first
    user.last_name = last
    user.headline = headline
    user.city = city
    user.lat = lat
    user.lon = lon
    user.email_verified_at = user.email_verified_at or now
    user.onboarded_at = user.onboarded_at or now
    db.flush()
    return user


def _seed_bio(db: Session, user: User, bio_text: str, intent_tags: list[str]) -> None:
    # Only call the embedding provider when the bio actually changed (or has
    # never been generated) so a repeat demo-login doesn't re-hit OpenAI.
    if user.bio_text == bio_text and user.bio_embedding is not None:
        user.intent_tags = intent_tags
        db.flush()
        return
    user.bio_text = bio_text
    user.intent_tags = intent_tags
    user.bio_embedding = generate_bio_embedding(bio_text)
    db.flush()


def _seed_presence(db: Session, user: User, lat: float, lon: float, now: datetime) -> None:
    """Idempotent, and refreshed forward on every call — same "always live"
    convention as _seed_plan."""
    presence = db.query(Presence).filter(Presence.user_id == user.id).one_or_none()
    lat, lon = _snap(lat), _snap(lon)
    if presence is None:
        presence = Presence(
            user_id=user.id, lat=lat, lon=lon,
            location=f"SRID=4326;POINT({lon} {lat})",
            started_at=now,
        )
        db.add(presence)
    presence.lat = lat
    presence.lon = lon
    presence.location = f"SRID=4326;POINT({lon} {lat})"
    presence.expires_at = now + PRESENCE_TTL
    db.flush()


def _seed_plan(db: Session, owner: User, seed: dict, now: datetime) -> Plan:
    starts_at = now + timedelta(minutes=seed["starts_in"])
    ends_at = starts_at + timedelta(minutes=seed["minutes"])
    lat, lon = _snap(seed["lat"]), _snap(seed["lon"])

    plan = db.query(Plan).filter(
        Plan.user_id == owner.id, Plan.detail == seed["detail"],
    ).one_or_none()
    if plan is None:
        plan = Plan(
            user_id=owner.id,
            activity=seed["activity"],
            openness=seed["openness"],
            detail=seed["detail"],
            lat=lat,
            lon=lon,
            location=f"SRID=4326;POINT({lon} {lat})",
        )
        db.add(plan)
    # Re-window and re-pin on every call so a later city pick stays live.
    plan.lat = lat
    plan.lon = lon
    plan.location = f"SRID=4326;POINT({lon} {lat})"
    plan.starts_at = starts_at
    plan.ends_at = ends_at
    plan.text = _assemble_plan_text(
        seed["activity"], seed["openness"], starts_at, ends_at, seed["detail"],
    )
    db.flush()
    return plan


def _seed_room(db: Session, demo: User, seed: dict, people: list[User]) -> Room:
    room = db.query(Room).filter(
        Room.creator_id == demo.id, Room.name == seed["name"],
    ).one_or_none()
    lat, lon = seed.get("lat"), seed.get("lon")
    if room is None:
        room = Room(
            creator_id=demo.id,
            name=seed["name"],
            purpose=seed["purpose"],
            visibility=seed["visibility"],
            lat=None if lat is None else _snap(lat),
            lon=None if lon is None else _snap(lon),
            location=None if lat is None else f"SRID=4326;POINT({_snap(lon)} {_snap(lat)})",
        )
        db.add(room)
        db.flush()
    elif lat is not None and lon is not None:
        room.lat = _snap(lat)
        room.lon = _snap(lon)
        room.location = f"SRID=4326;POINT({_snap(lon)} {_snap(lat)})"

    for index in [0, *seed["members"]]:
        user = people[index]
        exists = db.query(RoomMember).filter(
            RoomMember.room_id == room.id, RoomMember.user_id == user.id,
        ).count() > 0
        if not exists:
            db.add(RoomMember(room_id=room.id, user_id=user.id))
    db.flush()
    return room


def _seed_room_chat(
    db: Session, room: Room, people: list[User], shared_plan: Plan, now: datetime,
) -> None:
    """Text, a shared plan and an open proposal — the three things the room UI
    renders. Seeded as a unit: either the room's thread exists or it doesn't."""
    proposal = db.query(TimeProposal).filter(TimeProposal.room_id == room.id).one_or_none()
    starts_at = (now + timedelta(days=1)).replace(minute=0, second=0, microsecond=0)
    ends_at = starts_at + timedelta(hours=1)

    if proposal is None:
        proposal = TimeProposal(
            room_id=room.id,
            proposer_id=people[0].id,
            starts_at=starts_at,
            ends_at=ends_at,
            status="proposed",
        )
        db.add(proposal)
        db.flush()
    else:
        proposal.starts_at = starts_at
        proposal.ends_at = ends_at

    # Priya is in; the demo user and Marcus haven't answered, so the card shows
    # a live "1 of 3" for the person being shown the app to act on.
    priya_member = db.query(RoomMember).filter(
        RoomMember.room_id == room.id, RoomMember.user_id == people[1].id,
    ).one()
    already = db.query(TimeProposalConfirmation).filter(
        TimeProposalConfirmation.proposal_id == proposal.id,
        TimeProposalConfirmation.room_member_id == priya_member.id,
    ).count() > 0
    if not already:
        db.add(TimeProposalConfirmation(
            proposal_id=proposal.id, room_member_id=priya_member.id,
        ))

    if db.query(RoomMessage).filter(RoomMessage.room_id == room.id).count() > 0:
        db.flush()
        return

    created = now - timedelta(minutes=30)
    for offset, (sender, body) in enumerate(CHAT_SEEDS):
        db.add(RoomMessage(
            room_id=room.id, sender_id=people[sender].id, kind="text", body=body,
            created_at=created + timedelta(minutes=offset),
        ))
    db.add(RoomMessage(
        room_id=room.id, sender_id=people[0].id, kind="plan_share",
        body="Here's where I'll be.", plan_id=shared_plan.id,
        created_at=created + timedelta(minutes=len(CHAT_SEEDS)),
    ))
    db.add(RoomMessage(
        room_id=room.id, sender_id=people[0].id, kind="time_proposal",
        body="Does tomorrow morning work for a proper sit-down?",
        time_proposal_id=proposal.id,
        created_at=created + timedelta(minutes=len(CHAT_SEEDS) + 1),
    ))
    db.flush()


def get_or_create_demo_user(
    db: Session,
    lat: float | None = None,
    lon: float | None = None,
    city: str | None = None,
) -> User:
    """Returns the one demo user, with its world seeded around the chosen city."""
    now = datetime.now(timezone.utc)
    origin_lat = DEMO_LAT if lat is None else lat
    origin_lon = DEMO_LON if lon is None else lon
    origin_city = city or DEMO_CITY

    demo = _get_or_create_user(
        db, DEMO_EMAIL, "Demo", "Guest",
        headline="Just exploring",
        lat=origin_lat, lon=origin_lon, city=origin_city,
    )
    people = [demo] + [
        _get_or_create_user(
            db, email, first, last,
            headline=headline, lat=origin_lat, lon=origin_lon, city=origin_city,
        )
        for _, email, first, last, headline in COMPANIONS
    ]

    plan_seeds = [
        {**s, "lat": origin_lat + s["lat_off"], "lon": origin_lon + s["lon_off"]}
        for s in PLAN_SEEDS
    ]
    room_seeds = [
        {
            **s,
            "lat": None if s["lat_off"] is None else origin_lat + s["lat_off"],
            "lon": None if s["lon_off"] is None else origin_lon + s["lon_off"],
        }
        for s in ROOM_SEEDS
    ]
    plans = [_seed_plan(db, people[s["owner"]], s, now) for s in plan_seeds]
    rooms = {s["name"]: _seed_room(db, demo, s, people) for s in room_seeds}
    _seed_room_chat(db, rooms[CHATTY_ROOM], people, plans[0], now)

    # In-venue matching demo: give the demo user and companions real bios, and
    # put the companions live in Presence so toggling Presence on has an
    # actual field of candidates to rank. The demo user's own Presence is left
    # for them to toggle on themselves — that's the interactive demo moment.
    _seed_bio(db, demo, DEMO_BIO, DEMO_INTENT_TAGS)
    for companion in people[1:]:
        bio_text, intent_tags = COMPANION_BIOS[companion.email]
        _seed_bio(db, companion, bio_text, intent_tags)
        _seed_presence(db, companion, origin_lat, origin_lon, now)

    db.commit()
    db.refresh(demo)
    return demo
