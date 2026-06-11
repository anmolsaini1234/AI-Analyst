function InsightCard({ insight }) {

    if (!insight) {
        return null;
    }

    return (

        <div className="insight-card">

            <div className="insight-header">

                <div className="insight-icon">
                    ✨
                </div>

                <div>

                    <h3>
                        AI Generated Insights
                    </h3>

                    <span className="insight-subtitle">
                        Automated analytical summary
                    </span>

                </div>

            </div>

            <div className="insight-content">

                <p>
                    {insight}
                </p>

            </div>

        </div>
    );
}

export default InsightCard;