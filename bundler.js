const fs = require("fs");
const path = require("path");

function bundle(file, output) {
  const alreadyBundled = new Set(); // Set, um bereits importierte Module zu verfolgen
  const content = getContentOfFile(file);

  const dependencies = getDependenciesOfContent(content, path.dirname(file));

  const newContent = addResolvedDependenciesToContent(
    removeDependenciesFromContent(content),
    getDependencyContent(dependencies, alreadyBundled)
  );

  writeBundledFile(output, newContent);
}

const getContentOfFile = (file) => {
  const content = fs.readFileSync(file, "utf-8");
  return content;
};

const getDependenciesOfContent = (content, baseDir) => {
  const dependencies = [];
  const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;

  let match;
  while ((match = importRegex.exec(content))) {
    let dependencyPath = match[1];

    // Überprüfen, ob der Pfad bereits die Erweiterung ".js" hat
    if (!path.extname(dependencyPath)) {
      dependencyPath += ".js"; // Erweiterung nur anhängen, wenn sie fehlt
    }

    const resolvedDependencyPath = path.resolve(baseDir, dependencyPath);
    dependencies.push(resolvedDependencyPath);
  }

  return dependencies;
};

const removeDependenciesFromContent = (content) => {
  const importRegex = /import\s+.*\s+from\s+['"](.*)['"];/g;
  const newContent = content.replace(importRegex, "").trim();
  return newContent;
};

const getDependencyContent = (dependencies, alreadyBundled) => {
  const dependencyContent = {};

  dependencies.forEach((dependency) => {
    // Überspringen, wenn das Modul bereits importiert wurde
    if (alreadyBundled.has(dependency)) return;

    const content = getContentOfFile(dependency);

    const subDependencies = getDependenciesOfContent(
      content,
      path.dirname(dependency)
    );

    const resolvedContent = addResolvedDependenciesToContent(
      removeDependenciesFromContent(content),
      getDependencyContent(subDependencies, alreadyBundled)
    );

    // Markiere dieses Modul als gebündelt
    alreadyBundled.add(dependency);

    dependencyContent[dependency] = resolvedContent;
  });

  return dependencyContent;
};

const addResolvedDependenciesToContent = (content, dependencyContent) => {
  const newContent =
    Object.values(dependencyContent).join("\n") + "\n" + content.trim();
  return newContent;
};

const writeBundledFile = (output, bundledContent) => {
  fs.writeFileSync(output, bundledContent);
};

// Start the bundling process
bundle("./src/index.js", "./dist/bundle.js");
