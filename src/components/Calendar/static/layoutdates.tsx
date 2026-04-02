function LayoutDates() {
  const divsPerDay = 2;
  const totalDivs = 24 * divsPerDay;
  const segments = Array.from({ length: totalDivs }, (_, index) => {
    const top = `${(index / totalDivs) * 100}%`;
    const bottom = `${((totalDivs - index - 1) / totalDivs) * 100}%`;

    const label = index % divsPerDay === 0 ? String(index / divsPerDay) : "";

    return {
      top,
      bottom,
      label,
      segmentStyle: label === "" ? "solid" : "dashed",
    };
  });

  const basedStyle =
    "text-center inset-x-0 border-b-2 border-grey-300 bg-white absolute";
  return (
    <div
      className="relative min-w-[48px] h-[1440px]"
      style={{
        backgroundColor: "white",
        color: "grey",
      }}
    >
      {segments.map((item, index) => {
        return (
          <time
            className={basedStyle}
            style={
              {
                top: item.top,
                bottom: item.bottom,
                borderBottomStyle: item.segmentStyle,
              } as React.CSSProperties
            }
            key={index}
          >
            {item.label}
          </time>
        );
      })}
    </div>
  );
}

export default LayoutDates;
