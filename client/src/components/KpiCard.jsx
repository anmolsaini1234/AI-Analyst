function KpiCard({

    title,
    value

}) {

    return (

        <div className="kpi-card">

            <div className="kpi-top">

                <div className="kpi-icon">
                    📊
                </div>

                <div className="kpi-badge">
                    LIVE ANALYTICS
                </div>

            </div>

            <div className="kpi-content">

                <h3>
                    {title}
                </h3>

                <h1>
                    {value}
                </h1>

            </div>

        </div>
    );
}

export default KpiCard;