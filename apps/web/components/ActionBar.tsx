"use client";

/**
 * The page's action bar: one place, on every screen size, for what you do next.
 * Sticks to the bottom of the viewport (above the phone tab bar below `md`), with an optional note on the left.
 * Order the buttons secondary first, primary last: on desktop they sit at the right, on phones they share the width.
 * The primary button is always the next step, worded with an arrow ("Open plan →").
 */
export function ActionBar({
  note,
  children,
}: {
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-16 z-20 -mx-5 mt-6 border-t border-line bg-bg/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 md:bottom-0 md:mt-4 md:shrink-0">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-3">
        {note ? (
          <div className="min-w-0 flex-1 text-[14px] text-muted">{note}</div>
        ) : (
          <span className="hidden flex-1 md:block" />
        )}
        <div className="flex w-full gap-2 md:w-auto [&>*]:flex-1 md:[&>*]:flex-none">
          {children}
        </div>
      </div>
    </div>
  );
}
