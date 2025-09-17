#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import ts from 'typescript';
const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const DEFAULT_TARGETS = ['src'];
function parseArgs(argv) {
    const args = [...argv];
    const options = { format: 'stylish', targets: [], lintAll: false };
    while (args.length > 0) {
        const arg = args.shift();
        if (arg === '--format' || arg === '-f') {
            options.format = args.shift() ?? options.format;
        }
        else if (arg.startsWith('--format=')) {
            options.format = arg.split('=')[1] ?? options.format;
        }
        else if (arg === '--all') {
            options.lintAll = true;
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
    console.log(`Usage: node scripts/lint.mjs [options] [paths...]\n\n` +
        `Options:\n` +
        `  --format, -f <format>  Output format (stylish | unix). Default: stylish\n` +
        `  --all                  Lint all default targets\n` +
        `  --help, -h             Show this message\n` +
        `\nWithout explicit paths, only files changed from the current HEAD are linted.\n`);
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
function buildProgram(files) {
    return ts.createProgram(files, {
        allowJs: true,
        checkJs: true,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        skipLibCheck: true,
        allowNonTsExtensions: true,
    });
}
function createIssue(filePath, sourceFile, node, ruleId, severity, message) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return {
        filePath: path.relative(process.cwd(), filePath),
        line: line + 1,
        column: character + 1,
        ruleId,
        severity,
        message,
    };
}
function lint(program, files) {
    const issues = [];
    const checker = program.getTypeChecker();
    const isProduction = process.env.NODE_ENV === 'production';
    for (const filePath of files) {
        const sourceFile = program.getSourceFile(filePath);
        if (!sourceFile) {
            continue;
        }
        const letDeclarations = new Map();
        function markLet(symbol, info) {
            if (!symbol) {
                return;
            }
            const key = symbol.escapedName.toString();
            if (!letDeclarations.has(key)) {
                letDeclarations.set(key, { ...info, reassigned: false });
            }
        }
        function noteReassignment(symbol) {
            if (!symbol) {
                return;
            }
            const key = symbol.escapedName.toString();
            const existing = letDeclarations.get(key);
            if (existing) {
                existing.reassigned = true;
            }
        }
        function inspectLoop(body) {
            const statements = ts.isBlock(body) ? [...body.statements] : [body];
            if (statements.length === 0) {
                return;
            }
            const first = statements[0];
            if (ts.isBlock(body) && statements.length === 1 && (ts.isBreakStatement(first) || ts.isReturnStatement(first) || ts.isThrowStatement(first))) {
                issues.push(createIssue(filePath, sourceFile, first, 'no-unreachable-loop', 'error', 'This loop exits on its first iteration.'));
            }
            else if (!ts.isBlock(body) && (ts.isBreakStatement(first) || ts.isReturnStatement(first) || ts.isThrowStatement(first))) {
                issues.push(createIssue(filePath, sourceFile, first, 'no-unreachable-loop', 'error', 'This loop exits on its first iteration.'));
            }
        }
        function visit(node) {
            if (ts.isDebuggerStatement(node)) {
                issues.push(createIssue(filePath, sourceFile, node, 'no-debugger', 'warn', 'Unexpected debugger statement.'));
            }
            if (ts.isCallExpression(node)) {
                const expression = node.expression;
                if (ts.isPropertyAccessExpression(expression)) {
                    if (ts.isIdentifier(expression.expression) && expression.expression.text === 'console') {
                        const severity = isProduction ? 'error' : 'warn';
                        issues.push(createIssue(filePath, sourceFile, expression.name, 'no-console', severity, `Unexpected console.${expression.name.text} call.`));
                    }
                }
                if (ts.isParenthesizedExpression(expression) && ts.isPropertyAccessExpression(expression.expression) && expression.expression.questionDotToken && !node.questionDotToken) {
                    issues.push(createIssue(filePath, sourceFile, node, 'no-unsafe-optional-chaining', 'error', 'Optional chaining call should be explicitly chained.'));
                }
            }
            if (ts.isEmptyStatement(node)) {
                const parent = node.parent;
                if (!ts.isForStatement(parent) && !ts.isWhileStatement(parent) && !ts.isDoStatement(parent)) {
                    issues.push(createIssue(filePath, sourceFile, node, 'no-extra-semi', 'warn', 'Unnecessary semicolon.'));
                }
            }
            if (ts.isElementAccessExpression(node)) {
                const argument = node.argumentExpression;
                if (argument && ts.isStringLiteral(argument)) {
                    if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(argument.text)) {
                        issues.push(createIssue(filePath, sourceFile, node.argumentExpression, 'dot-notation', 'warn', 'Use dot notation instead of bracket notation.'));
                    }
                }
            }
            if (ts.isBinaryExpression(node)) {
                if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken || node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken) {
                    issues.push(createIssue(filePath, sourceFile, node.operatorToken, 'eqeqeq', 'error', 'Use === and !== instead of == and !=.'));
                }
                if (isAssignmentOperator(node.operatorToken.kind)) {
                    const target = node.left;
                    if (ts.isIdentifier(target)) {
                        noteReassignment(checker.getSymbolAtLocation(target));
                    }
                }
            }
            if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
                if (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) {
                    const operand = node.operand;
                    if (ts.isIdentifier(operand)) {
                        noteReassignment(checker.getSymbolAtLocation(operand));
                    }
                }
            }
            if (ts.isVariableDeclarationList(node)) {
                const flags = ts.getCombinedNodeFlags(node);
                if ((flags & ts.NodeFlags.Var) === ts.NodeFlags.Var) {
                    issues.push(createIssue(filePath, sourceFile, node, 'no-var', 'error', 'Unexpected var, use let or const instead.'));
                }
                if ((flags & ts.NodeFlags.Let) === ts.NodeFlags.Let) {
                    for (const declaration of node.declarations) {
                        if (ts.isIdentifier(declaration.name)) {
                            const parent = node.parent;
                            const inForInOf = ts.isForInStatement(parent) || ts.isForOfStatement(parent);
                            const symbol = checker.getSymbolAtLocation(declaration.name);
                            markLet(symbol, { node: declaration, sourceFile, inForInOf });
                        }
                    }
                }
            }
            if (ts.isIfStatement(node)) {
                if (!ts.isBlock(node.thenStatement)) {
                    issues.push(createIssue(filePath, sourceFile, node.thenStatement, 'curly', 'error', 'Expected { } around if body.'));
                }
                if (node.elseStatement && !ts.isBlock(node.elseStatement) && !ts.isIfStatement(node.elseStatement)) {
                    issues.push(createIssue(filePath, sourceFile, node.elseStatement, 'curly', 'error', 'Expected { } around else body.'));
                }
            }
            if (ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
                if (!ts.isBlock(node.statement)) {
                    issues.push(createIssue(filePath, sourceFile, node.statement, 'curly', 'error', 'Expected { } around loop body.'));
                }
                inspectLoop(node.statement);
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
        for (const info of letDeclarations.values()) {
            if (info.inForInOf) {
                continue;
            }
            if (!info.reassigned) {
                issues.push(createIssue(filePath, sourceFile, info.node.name, 'prefer-const', 'error', 'Use const instead of let.'));
            }
        }
    }
    return issues;
}
function isAssignmentOperator(kind) {
    switch (kind) {
        case ts.SyntaxKind.EqualsToken:
        case ts.SyntaxKind.PlusEqualsToken:
        case ts.SyntaxKind.MinusEqualsToken:
        case ts.SyntaxKind.AsteriskEqualsToken:
        case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
        case ts.SyntaxKind.SlashEqualsToken:
        case ts.SyntaxKind.PercentEqualsToken:
        case ts.SyntaxKind.AmpersandEqualsToken:
        case ts.SyntaxKind.BarEqualsToken:
        case ts.SyntaxKind.CaretEqualsToken:
        case ts.SyntaxKind.LessThanLessThanEqualsToken:
        case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
            return true;
        default:
            return false;
    }
}
function formatStylish(issues) {
    if (issues.length === 0) {
        console.log('✓ No lint issues found');
        return;
    }
    const grouped = new Map();
    for (const issue of issues) {
        if (!grouped.has(issue.filePath)) {
            grouped.set(issue.filePath, []);
        }
        grouped.get(issue.filePath).push(issue);
    }
    for (const [filePath, fileIssues] of grouped) {
        console.log(filePath);
        for (const issue of fileIssues.sort((a, b) => a.line - b.line || a.column - b.column)) {
            const sev = issue.severity === 'error' ? 'error' : 'warn ';
            console.log(`  ${issue.line}:${issue.column}  ${sev}  ${issue.ruleId}  ${issue.message}`);
        }
    }
}
function formatUnix(issues) {
    for (const issue of issues) {
        const marker = issue.severity === 'error' ? 'E' : 'W';
        console.log(`${issue.filePath}:${issue.line}:${issue.column}: [${marker}] ${issue.ruleId}: ${issue.message}`);
    }
}
function main() {
    const options = parseArgs(process.argv.slice(2));
    let targets = options.targets;
    if (targets.length === 0) {
        if (options.lintAll) {
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
        console.log('No matching files found. Use --all to lint the entire project.');
        process.exit(0);
    }
    const program = buildProgram(files);
    const issues = lint(program, files).sort((a, b) => {
        if (a.filePath !== b.filePath) {
            return a.filePath.localeCompare(b.filePath);
        }
        if (a.line !== b.line) {
            return a.line - b.line;
        }
        return a.column - b.column;
    });
    if (options.format === 'unix') {
        formatUnix(issues);
    }
    else {
        formatStylish(issues);
    }
    const hasError = issues.some((issue) => issue.severity === 'error');
    process.exit(hasError ? 1 : 0);
}
main();
