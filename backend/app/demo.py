"""The seeded demo account behind POST /auth/demo-login.

Everything here is check-then-create against fixed emails/names/details, so the
endpoint can be hit any number of times across any number of demos without
duplicating a user, a plan, a room or a message. Time-boxed rows (plans, the
open proposal) are moved forward on each call instead, so the demo is always
"live now" rather than an archive of the first time it ran.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .models import (
    Plan,
    Room,
    RoomMember,
    RoomMessage,
    TimeProposal,
    TimeProposalConfirmation,
    User,
)
from .routers.plans import _assemble_plan_text, _snap

DEMO_EMAIL = "demo@stayconnected.app"
DEMO_CITY = "Mountain View, CA"
# Same fallback location the frontend uses when geolocation is unavailable.
DEMO_LAT = 37.3861
DEMO_LON = -122.0839

# Fellow demo residents. They exist so member counts, plan authorship and
# partial confirmations look like a real neighborhood rather than an empty one.
COMPANIONS = [
    (0, "demo-priya@stayconnected.app", "Priya", "Raman"),
    (1, "demo-marcus@stayconnected.app", "Marcus", "Ellis"),
]

# owner: 0 = the demo user, 1 = Priya, 2 = Marcus.
PLAN_SEEDS = [
    {
        "owner": 0, "activity": "cowork", "openness": "open_to_chat",
        "detail": "Red Rock Coffee, upstairs by the window.",
        "lat": DEMO_LAT, "lon": DEMO_LON,
        "starts_in": -20, "minutes": 150,
    },
    {
        "owner": 1, "activity": "coffee", "openness": "actively_meeting",
        "detail": "Philz on Castro — happy to talk job hunt.",
        "lat": DEMO_LAT + 0.004, "lon": DEMO_LON - 0.005,
        "starts_in": -5, "minutes": 90,
    },
    {
        "owner": 2, "activity": "meal", "openness": "heads_down",
        "detail": "Lunch at the Caltrain plaza, laptop open.",
        "lat": DEMO_LAT - 0.006, "lon": DEMO_LON + 0.003,
        "starts_in": 15, "minutes": 60,
    },
]

CHATTY_ROOM = "Peninsula Regulars"

ROOM_SEEDS = [
    {"name": CHATTY_ROOM, "purpose": "cowork", "visibility": "public",
     "lat": DEMO_LAT, "lon": DEMO_LON, "members": [1, 2]},
    {"name": "Founders Cowork Wednesdays", "purpose": "cowork", "visibility": "public",
     "lat": DEMO_LAT + 0.002, "lon": DEMO_LON + 0.002, "members": [2]},
    {"name": "Job Hunt Support Circle", "purpose": "job_hunting", "visibility": "private",
     "lat": None, "lon": None, "members": [1]},
]

# (sender, body) — the prose around the two cards in the chatty room.
CHAT_SEEDS = [
    (1, "Morning! I'm at Red Rock till about noon if anyone wants to join."),
    (0, "On my way — grabbing the big table upstairs."),
    (2, "Can't make this morning, but I'm around after lunch."),
]


def _get_or_create_user(db: Session, email: str, first: str, last: str) -> User:
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is None:
        user = User(email=email)
        db.add(user)
    now = datetime.now(timezone.utc)
    user.first_name = first
    user.last_name = last
    user.city = DEMO_CITY
    user.lat = DEMO_LAT
    user.lon = DEMO_LON
    user.email_verified_at = user.email_verified_at or now
    user.onboarded_at = user.onboarded_at or now
    db.flush()
    return user


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
    # Re-window on every call so a demo run months later still shows live plans.
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
    if room is None:
        lat, lon = seed["lat"], seed["lon"]
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


def get_or_create_demo_user(db: Session) -> User:
    """Returns the one demo user, with its world seeded around it."""
    now = datetime.now(timezone.utc)
    demo = _get_or_create_user(db, DEMO_EMAIL, "Demo", "Guest")
    people = [demo] + [
        _get_or_create_user(db, email, first, last)
        for _, email, first, last in COMPANIONS
    ]

    plans = [_seed_plan(db, people[s["owner"]], s, now) for s in PLAN_SEEDS]
    rooms = {s["name"]: _seed_room(db, demo, s, people) for s in ROOM_SEEDS}
    _seed_room_chat(db, rooms[CHATTY_ROOM], people, plans[0], now)

    db.commit()
    db.refresh(demo)
    return demo
