import BottomTabNav from "./BottomTabNav";
import TopNav from "./TopNav";

/** Both nav shells for the signed-in sections. Which one is visible is decided
 *  purely by the `md` breakpoint, so pages mount this one component. */
export default function SectionNav({ userInitial }: { userInitial?: string }) {
  return (
    <>
      <TopNav userInitial={userInitial} />
      <BottomTabNav />
    </>
  );
}
