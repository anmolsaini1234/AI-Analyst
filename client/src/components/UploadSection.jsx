function UploadSection({

    setFile,
    handleUpload

}) {

    return (

        <div className="upload-section">

            <label className="upload-box">

                <div className="upload-icon">
                    📂
                </div>

                <div className="upload-text">

                    <h4>
                        Upload CSV Dataset
                    </h4>

                    <p>
                        Drag and drop or browse file
                    </p>

                </div>

                <input
                    type="file"
                    accept=".csv"

                    onChange={(e) =>
                        setFile(
                            e.target.files[0]
                        )
                    }
                />

            </label>

            <button
                className="upload-btn"
                onClick={handleUpload}
            >
                Upload Dataset
            </button>

        </div>
    );
}

export default UploadSection;