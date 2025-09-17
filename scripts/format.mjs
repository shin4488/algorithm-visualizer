#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import ts from 'typescript';
const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.yml', '.yaml', '.md']);
const DEFAULT_TARGETS = ['src', 'package.json', 'tsconfig.json', 'vitest.config.ts', '.github'];
function parseArgs(argv) {
    const args = [...argv];
    const options = { mode: 'check', format: 'stylish', targets: [], formatAll: false };
    while (args.length > 0) {
        const arg = args.shift();
        if (arg === '--write') {
            options.mode = 'write';
        }
        else if (arg === '--check') {
            options.mode = 'check';
        }
        else if (arg === '--format' || arg === '-f') {
            options.format = args.shift() ?? options.format;
        }
        else if (arg.startsWith('--format=')) {
            options.format = arg.split('=')[1] ?? options.format;
        }
        else if (arg === '--all') {
            options.formatAll = true;
        }
        else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
        else {
            options.targets.push(arg);
        }
    }
    return options;
}
function printHelp() {
    console.log(`Usage: node scripts/format.mjs [options] [paths...]\n\n` +
        `Options:\n` +
        `  --write            Apply formatting changes\n` +
        `  --check            Check formatting without writing (default)\n` +
        `  --format, -f       Output format (stylish | unix). Default: stylish\n` +
        `  --all              Include all default targets\n` +
        `  --help, -h         Show this message\n` +
        `\nWithout explicit paths, only files changed from the current HEAD are processed.\n`);
}
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', '.yarn', 'dist', 'public', '.parcel-cache']);
function getChangedFiles() {
    try {
        const changed = new Set();
        const diffOutput = execSync('git diff --name-only --diff-filter=ACMRTUXB HEAD', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        diffOutput.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => changed.add(line));
        const untrackedOutput = execSync('git ls-files --others --exclude-standard', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        untrackedOutput.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => changed.add(line));
        return Array.from(changed);
    }
    catch (error) {
        return [];
    }
}
function collectFiles(targets) {
    const result = [];
    const seen = new Set();
    for (const target of targets) {
        const absolute = path.resolve(process.cwd(), target);
        if (!fs.existsSync(absolute)) {
            continue;
        }
        traverse(absolute, result, seen);
    }
    return result;
}
function traverse(currentPath, collector, seen) {
    const stat = fs.statSync(currentPath);
    if (stat.isDirectory()) {
        const base = path.basename(currentPath);
        if (IGNORED_DIRECTORIES.has(base)) {
            return;
        }
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
            traverse(path.join(currentPath, entry), collector, seen);
        }
    }
    else if (stat.isFile()) {
        const ext = path.extname(currentPath);
        if (!SUPPORTED_EXTENSIONS.has(ext)) {
            return;
        }
        const normalized = path.normalize(currentPath);
        if (!seen.has(normalized)) {
            collector.push(normalized);
            seen.add(normalized);
        }
    }
}
function getScriptKind(extension) {
    switch (extension) {
        case '.ts':
            return ts.ScriptKind.TS;
        case '.tsx':
            return ts.ScriptKind.TSX;
        case '.jsx':
            return ts.ScriptKind.JSX;
        case '.js':
        case '.mjs':
            return ts.ScriptKind.JS;
        default:
            return ts.ScriptKind.Unknown;
    }
}
function formatText(filePath, text) {
    const extension = path.extname(filePath);
    if (extension === '.json') {
        try {
            const json = JSON.parse(text);
            return `${JSON.stringify(json, null, 2)}\n`;
        }
        catch (error) {
            return text;
        }
    }
    if (extension === '.yml' || extension === '.yaml' || extension === '.md') {
        return text.endsWith('\n') ? text : `${text}\n`;
    }
    const scriptKind = getScriptKind(extension);
    const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const printed = printer.printFile(sourceFile);
    return printed.endsWith('\n') ? printed : `${printed}\n`;
}
function formatStylish(issues) {
    if (issues.length === 0) {
        console.log('✓ Formatting looks good');
        return;
    }
    for (const issue of issues) {
        console.log(`${issue.filePath}: needs formatting`);
    }
}
function formatUnix(issues) {
    for (const issue of issues) {
        console.log(`${issue.filePath}:1:1: [E] format: ${issue.message}`);
    }
}
function main() {
    const options = parseArgs(process.argv.slice(2));
    let targets = options.targets;
    if (targets.length === 0) {
        if (options.formatAll) {
            targets = DEFAULT_TARGETS;
        }
        else {
            const changed = getChangedFiles();
            if (changed.length > 0) {
                targets = changed;
            }
        }
    }
    const files = collectFiles(targets);
    if (files.length === 0) {
        if (options.mode === 'check') {
            console.log('No matching files found. Use --all to format the entire project.');
        }
        return;
    }
    const issues = [];
    for (const filePath of files) {
        const original = fs.readFileSync(filePath, 'utf8');
        const formatted = formatText(filePath, original);
        if (options.mode === 'write') {
            if (formatted !== original) {
                fs.writeFileSync(filePath, formatted, 'utf8');
            }
        }
        else {
            if (formatted !== original) {
                issues.push({
                    filePath: path.relative(process.cwd(), filePath),
                    message: 'File is not formatted. Run `yarn format` to update.',
                });
            }
        }
    }
    if (options.mode === 'check') {
        if (options.format === 'unix') {
            formatUnix(issues);
        }
        else {
            formatStylish(issues);
        }
        process.exit(issues.length === 0 ? 0 : 1);
    }
}
main();
