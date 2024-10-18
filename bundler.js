const fs = require("fs");
const path = require("path");

// Ensure the output directory exists
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Main bundling function
function bundle(entryFile, outputFile) {
  const alreadyBundled = new Set();
  const entryContent = readFileContent(entryFile);

  const dependencies = findDependencies(entryContent, path.dirname(entryFile));

  const bundledContent = combineDependenciesAndContent(
    stripImports(entryContent),
    loadDependencyContent(dependencies, alreadyBundled)
  );

  ensureDirectoryExists(path.dirname(outputFile));

  const startTime = performance.now();
  writeBundledFile(outputFile, bundledContent);
  const endTime = performance.now();
  const duration = endTime - startTime;
  console.log(`Bundling completed in ${duration.toFixed(2)} ms`);
}

// Utility functions
const readFileContent = (filePath) => {
  return fs.readFileSync(filePath, "utf-8");
};

const findDependencies = (content, baseDir) => {
  const dependencies = [];
  const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;

  let match;
  while ((match = importRegex.exec(content))) {
    let dependencyPath = match[1];

    if (!path.extname(dependencyPath)) {
      dependencyPath += ".js";
    }

    const resolvedDependencyPath = path.resolve(baseDir, dependencyPath);
    dependencies.push(resolvedDependencyPath);
  }

  return dependencies;
};

const stripImports = (content) => {
  const importRegex = /import\s+.*\s+from\s+['"](.*)['"];/g;
  return content.replace(importRegex, "").trim();
};

const loadDependencyContent = (dependencies, alreadyBundled) => {
  const dependencyContent = {};

  dependencies.forEach((dependency) => {
    if (alreadyBundled.has(dependency)) return;

    const content = readFileContent(dependency);
    const subDependencies = findDependencies(content, path.dirname(dependency));

    const resolvedContent = combineDependenciesAndContent(
      stripImports(content),
      loadDependencyContent(subDependencies, alreadyBundled)
    );

    alreadyBundled.add(dependency);
    dependencyContent[dependency] = resolvedContent;
  });

  return dependencyContent;
};

const combineDependenciesAndContent = (content, dependencyContent) => {
  return Object.values(dependencyContent).join("\n") + "\n" + content.trim();
};

const writeBundledFile = (outputFile, bundledContent) => {
  fs.writeFileSync(outputFile, bundledContent);
  console.log(`Bundle written: ${outputFile}`);
};

// Format timestamp
function formatTimestamp() {
  const now = new Date();
  return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
}

// Watch for file changes
function watchFiles(entryFile, outputFile) {
  const watchedFiles = new Set();

  const watchAndBundle = (file) => {
    if (!watchedFiles.has(file)) {
      watchedFiles.add(file);

      fs.watch(file, (eventType) => {
        if (eventType === "change") {
          const relativePath = path.relative(process.cwd(), file);
          console.log(
            `[${formatTimestamp()}] Change detected in: ./src/${relativePath}`
          );
          bundle(entryFile, outputFile);
        }
      });

      const content = readFileContent(file);
      const dependencies = findDependencies(content, path.dirname(file));

      dependencies.forEach(watchAndBundle);
    }
  };

  watchAndBundle(entryFile);
  bundle(entryFile, outputFile);
}

// Start watching and bundling process
watchFiles("./src/index.js", "./dist/bundle.js");
