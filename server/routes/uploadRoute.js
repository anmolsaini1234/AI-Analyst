const express = require("express");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

const {
    setFilePath
} = require("../services/fileStorage");

const router = express.Router();


// STORAGE CONFIG
const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {

        cb(
            null,
            Date.now() + "-" + file.originalname
        );
    }
});

const upload = multer({ storage });


// DETECT COLUMN TYPE
function detectColumnType(values) {

    let numericCount = 0;

    let booleanCount = 0;

    let dateCount = 0;

    values.forEach((value) => {

        const val = String(value).trim();

        // NUMERIC
        if (!isNaN(val) && val !== "") {
            numericCount++;
        }

        // BOOLEAN
        if (
            val.toLowerCase() === "true"
            ||
            val.toLowerCase() === "false"
        ) {
            booleanCount++;
        }

        // DATE
        if (
            !isNaN(Date.parse(val))
        ) {
            dateCount++;
        }
    });

    const total = values.length;

    if (numericCount >= total * 0.8) {
        return "numeric";
    }

    if (dateCount >= total * 0.8) {
        return "date";
    }

    if (booleanCount >= total * 0.8) {
        return "boolean";
    }

    return "text";
}


// UPLOAD ROUTE
router.post(
    "/",
    upload.single("file"),
    async (req, res) => {

        try {

            const results = [];

            fs.createReadStream(req.file.path)

                .pipe(csv())

                .on("data", (data) => {

                    results.push(data);
                })

                .on("end", () => {

                    // EMPTY CSV CHECK
                    if (results.length === 0) {

                        return res.status(400).json({
                            error: "CSV file is empty"
                        });
                    }

                    // GENERATE SMART SCHEMA
                    const schema = Object.keys(
                        results[0]
                    ).map((column) => {

                        const sampleValues =
                            results
                                .slice(0, 20)
                                .map(
                                    row => row[column]
                                )
                                .filter(
                                    val =>
                                        val !== undefined
                                        &&
                                        val !== null
                                        &&
                                        val !== ""
                                );

                        const type =
                            detectColumnType(
                                sampleValues
                            );

                        return {

                            name: column,

                            type,

                            sample_values:
                                sampleValues.slice(0, 5)
                        };
                    });

                    // ABSOLUTE PATH
                    const absolutePath =
                        path.resolve(req.file.path);

                    // SAVE FILE PATH
                    setFilePath(absolutePath);

                    // RESPONSE
                    res.json({

                        message:
                            "File uploaded successfully",

                        filePath:
                            req.file.path,

                        schema,

                        sampleData:
                            results.slice(0, 5)
                    });
                });

        } catch (error) {

            res.status(500).json({

                error: error.message
            });
        }
    }
);

module.exports = router;