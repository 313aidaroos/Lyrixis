import { BACKGROUND_SLIDES, SLIDE_COUNT, SLIDE_DURATION_S } from "./background/slides";

export function LivingBackground() {
  const totalDuration = SLIDE_COUNT * SLIDE_DURATION_S;

  return (
    <div className="living-bg" aria-hidden="true">
      <div
        className="living-bg__track"
        style={{ "--slide-duration": `${SLIDE_DURATION_S}s`, "--total-duration": `${totalDuration}s` } as React.CSSProperties}
      >
        {BACKGROUND_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className="living-bg__slide"
            style={{
              backgroundImage: `url("${slide.src}")`,
              animationDelay: `${index * SLIDE_DURATION_S}s`,
            }}
          />
        ))}
      </div>

      {/* Heavy scrim keeps text readable — images stay atmospheric, not dominant */}
      <div className="living-bg__scrim" />
      <div className="living-bg__vignette" />
    </div>
  );
}
