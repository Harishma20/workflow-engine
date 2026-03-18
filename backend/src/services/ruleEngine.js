/**
 * Rule Engine Service
 * Evaluates rule conditions safely using jsep AST parsing
 * Supports: ==, !=, <, >, <=, >=, &&, ||, contains(), startsWith(), endsWith()
 */

const jsep = require('jsep').default || require('jsep');

// Configure jsep to handle single-quoted strings
jsep.addBinaryOp('&&', 2);
jsep.addBinaryOp('||', 1);

/**
 * Evaluates a parsed AST node against data context
 */
function evaluateNode(node, data) {
  if (!node) throw new Error('Empty expression node');

  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier':
      return data[node.name] !== undefined ? data[node.name] : null;

    case 'MemberExpression': {
      const obj = evaluateNode(node.object, data);
      const prop = node.computed ? evaluateNode(node.property, data) : node.property.name;
      return obj ? obj[prop] : null;
    }

    case 'UnaryExpression':
      if (node.operator === '!') return !evaluateNode(node.argument, data);
      if (node.operator === '-') return -evaluateNode(node.argument, data);
      throw new Error(`Unsupported unary operator: ${node.operator}`);

    case 'BinaryExpression':
    case 'LogicalExpression': {
      const left = evaluateNode(node.left, data);
      const right = evaluateNode(node.right, data);
      switch (node.operator) {
        case '==': return left == right;   // intentional loose equality for type coercion
        case '!=': return left != right;
        case '<':  return left < right;
        case '>':  return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        case '&&': return left && right;
        case '||': return left || right;
        case '+':  return left + right;
        case '-':  return left - right;
        case '*':  return left * right;
        case '/':  return left / right;
        default:
          throw new Error(`Unsupported binary operator: ${node.operator}`);
      }
    }

    case 'CallExpression': {
      const funcName = node.callee.name || (node.callee.property && node.callee.property.name);
      const args = node.arguments.map(a => evaluateNode(a, data));

      switch (funcName) {
        case 'contains':
          return String(args[0] || '').includes(String(args[1] || ''));
        case 'startsWith':
          return String(args[0] || '').startsWith(String(args[1] || ''));
        case 'endsWith':
          return String(args[0] || '').endsWith(String(args[1] || ''));
        case 'toUpperCase':
          return String(args[0] || '').toUpperCase();
        case 'toLowerCase':
          return String(args[0] || '').toLowerCase();
        default:
          throw new Error(`Unknown function: ${funcName}`);
      }
    }

    case 'ConditionalExpression': {
      const test = evaluateNode(node.test, data);
      return test ? evaluateNode(node.consequent, data) : evaluateNode(node.alternate, data);
    }

    default:
      throw new Error(`Unknown expression type: ${node.type}`);
  }
}

/**
 * Evaluate a condition string against data
 * Returns { result: boolean, error: string|null }
 */
function evaluateCondition(condition, data) {
  if (!condition || typeof condition !== 'string') {
    return { result: false, error: 'Empty or invalid condition' };
  }

  const trimmed = condition.trim().toUpperCase();
  if (trimmed === 'DEFAULT' || trimmed === 'TRUE') {
    return { result: true, error: null };
  }

  try {
    const ast = jsep(condition);
    const result = evaluateNode(ast, data);
    return { result: Boolean(result), error: null };
  } catch (err) {
    return { result: false, error: err.message };
  }
}

/**
 * Evaluate list of rules (sorted by priority) against data
 * Returns: { matchedRule, evaluatedRules, error }
 */
function evaluateRules(rules, data) {
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
  const evaluatedRules = [];
  let matchedRule = null;
  let engineError = null;

  for (const rule of sortedRules) {
    const { result, error } = evaluateCondition(rule.condition, data);

    evaluatedRules.push({
      rule_id: rule._id,
      condition: rule.condition,
      priority: rule.priority,
      result,
      error: error || null,
    });

    if (error) {
      engineError = `Rule evaluation error (priority ${rule.priority}): ${error}`;
      // Skip bad rule, continue to next
      continue;
    }

    if (result && !matchedRule) {
      matchedRule = rule;
    }
  }

  return { matchedRule, evaluatedRules, error: engineError };
}

module.exports = { evaluateCondition, evaluateRules };
