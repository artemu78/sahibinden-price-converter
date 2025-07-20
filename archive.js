const fs = require("fs");
const path = require("path");

const ARCHIVE_FOLDER = "archives";
const packageJsonPath = path.join(__dirname, "package.json");
const manifestJsonPath = path.join(__dirname, "manifest.json");
const archiver = require("archiver");

function prepareFolder() {
  const archivePath = path.join(__dirname, ARCHIVE_FOLDER);
  if (!fs.existsSync(archivePath)) {
    fs.mkdirSync(archivePath);
  }
  return archivePath;
}

function getVersion() {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const version = packageJson.version;
  return version;
}

// Function to compress specified files and folders into a zip file
function compressAssets() {
  bumpVersion();
  const archivePath = prepareFolder();
  const version = getVersion();

  // Output file name includes the version from package.json
  const outputFileName = path.join(archivePath, `dist_v${version}.zip`);
  const output = fs.createWriteStream(outputFileName);
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Compression level
  });

  output.on("close", function () {
    console.log(
      `Archive ${outputFileName} has been created successfully. Total bytes: ${archive.pointer()}`
    );
  });

  archive.on("error", function (err) {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Add files and folders to the archive
  archive.file("manifest.json", { name: "manifest.json" });
  archive.file("content.js", { name: "content.js" });
  archive.file("options.js", { name: "options.js" });
  archive.file("options.html", { name: "options.html" });

  // Add the icons folder and dist folder recursively
  archive.directory("icons/", "icons");

  // Finalize the archive (i.e., finish writing the zip file)
  archive.finalize();
}

// Helper function to read a JSON file and parse it
function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Helper function to write a JSON object to a file
function writeJsonFile(filePath, json) {
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n");
}

// Function to bump the version
function bumpVersion() {
  const packageJson = readJsonFile(packageJsonPath);
  const manifestJson = readJsonFile(manifestJsonPath);

  // Assuming you want to bump the patch version,
  // but you can adjust the logic to bump major or minor as needed
  const versionParts = packageJson.version.split(".");
  versionParts[2] = parseInt(versionParts[2], 10) + 1; // Increment patch version
  const newVersion = versionParts.join(".");

  // Update versions in both files
  packageJson.version = newVersion;
  manifestJson.version = newVersion;

  // Write updated JSON back to the files
  writeJsonFile(packageJsonPath, packageJson);
  writeJsonFile(manifestJsonPath, manifestJson);

  console.log(`Version bumped to ${newVersion}`);
}

compressAssets();
