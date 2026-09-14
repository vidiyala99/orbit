/** Instant Home shell while the ranked queue loads: header, badge and dock placeholders. */
export default function HomeLoading() {
  return (
    <div className="badge-world bw-page" aria-busy="true" aria-label="Loading your event">
      <div className="bw-home">
        <header className="bw-header">
          <div className="bw-header-top">
            <span className="bw-wordmark">Actintro</span>
          </div>
          <div className="bw-header-main">
            <div className="bw-skeleton h-7 w-56 rounded" />
            <div className="bw-header-row">
              <div className="bw-skeleton h-4 w-20 rounded" />
            </div>
          </div>
        </header>
        <main className="bw-main">
          <div className="bw-card-stage">
            <span aria-hidden="true" className="bw-clip" />
            <div className="bw-card">
              <div className="bw-card-inner">
                <div className="bw-face bw-skeleton-card" />
              </div>
            </div>
          </div>
          <div className="bw-dock">
            <div className="bw-skeleton h-12 rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
}
