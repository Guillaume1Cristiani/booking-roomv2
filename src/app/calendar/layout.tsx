export default function CalendarLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return <section className=" bg-stone-100">{children}</section>;
}
