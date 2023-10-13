import * as fs from "fs";
import * as json2csv from "json2csv";

// Read the JSON data from the file
const jsonData: any = JSON.parse(fs.readFileSync("input.json", "utf8"));

// Define the CSV columns
const fields = [
  "dappId",
  "fields.description",
  "fields.minAge",
  "fields.isForMatureAudience",
  "fields.geoRestrictions.allowedCountries",
  "fields.geoRestrictions.blockedCountries",
  "fields.tags",
  "fields.images.logo",
  "fields.images.banner"
];

// Add screenshot indexes and values for the 'fields.images.screenshots' array
for (let i = 0; i < 5; i++) {
  fields.push(`fields.images.screenshots.${i}.index`);
  fields.push(`fields.images.screenshots.${i}.value`);
}

// Convert the JSON data to CSV format
const csv = json2csv.parse(jsonData, { fields });

// Write the CSV data to a file
fs.writeFileSync("outputOverirde.csv", csv);

console.log("CSV file has been created: outputOverirde.csv");
