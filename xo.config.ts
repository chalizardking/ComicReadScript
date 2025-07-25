import { type FlatXoConfig } from 'xo';
import solid from 'eslint-plugin-solid/configs/typescript';
import * as tsParser from '@typescript-eslint/parser';
import i18next from 'eslint-plugin-i18next';
import jsdoc from 'eslint-plugin-jsdoc';

const xoConfig: FlatXoConfig = [
  {
    ignores: ['**/dist/**', '**/public/**', '**/dev-dist/**', '*.user.js'],
  },
  // solid
  {
    files: ['**/*.{ts,tsx}'],
    ...solid,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
      },
    },
  },
  // i18next
  i18next.configs['flat/recommended'] as any,
  {
    files: ['!**/*.stories.tsx'],
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: ['^name', 'children', 'textContent', 'text'],
          },
        },
      ],
    },
  },
  // jsdoc
  jsdoc.configs['flat/contents-typescript-error'] as any,
  jsdoc.configs['flat/logical-typescript-error'] as any,
  jsdoc.configs['flat/stylistic-typescript-error'] as any,
  {
    rules: {
      // eslint-plugin-jsdoc 还无法识别出 TS 定义的接口
      'jsdoc/no-undefined-types': 'off',
      // 不强制要求 jsdoc
      'jsdoc/require-jsdoc': 'off',
      // TS 不需要写明类型注释
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
      // 允许无意义注释
      'jsdoc/informative-docs': 'off',
      'jsdoc/match-description': 'off',
      // 禁止加空格
      'jsdoc/lines-before-block': 'off',
      // 禁止行对齐
      'jsdoc/check-line-alignment': 'off',
      // 允许使用其他的 jsdoc 标签，以便使用 typescript-json-schema
      'jsdoc/check-tag-names': 'off',
      'jsdoc/check-param-names': [
        'warn',
        {
          checkDestructured: false,
          disableMissingParamChecks: true,
        },
      ],
      // 允许不写返回值
      'jsdoc/require-returns': 'off',
      // 允许有参数不被写明
      'jsdoc/require-param': 'off',
    },
  },

  {
    prettier: true,
    space: true,
    rules: {
      // 允许不使用 _ 命名的变量
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '_+',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '_+',
          destructuredArrayIgnorePattern: '_+',
          varsIgnorePattern: '_+',
          ignoreRestSiblings: true,
        },
      ],
      // 提示使用了 console
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      // 不知道为啥会对 `[...list].at(-1)` 报错
      'no-use-extend-native/no-use-extend-native': 'off',
      // 禁止重新赋值函数参数
      'no-param-reassign': 'error',
      // 不限制代码深度
      'max-depth': 'off',
      // 不限制文件名的大小写样式
      'unicorn/filename-case': 'off',
      // 不限制 import 的扩展名
      'import-x/extensions': 'off',
      'n/file-extension-in-import': 'off',
      // 不限制注释首字母大小写
      'capitalized-comments': 'off',
      // 不限制代码复杂性
      complexity: 'off',
      // 不限制函数参数数
      'max-params': 'off',
      // 不强制使用 querySelector
      'unicorn/prefer-query-selector': 'off',
      // 不强制使用 globalThis
      'unicorn/prefer-global-this': 'off',
      // 不限制在 switch case 中使用大括号
      'unicorn/switch-case-braces': 'off',
      // 允许直接传递函数给迭代器方法
      'unicorn/no-array-callback-reference': 'off',
      // 允许使用缩写
      'unicorn/prevent-abbreviations': 'off',
      // 允许默认导入变量名称和导入模块名称不同
      'import-x/no-named-as-default': 'off',
      // 允许在 Promise 中返回值
      'no-promise-executor-return': 'off',
      // 允许在循环中使用 await
      'no-await-in-loop': 'off',
      // 允许使用 js url
      'no-script-url': 'off',
      // 允许 TODO 注释
      'no-warning-comments': 'off',
      // 允许 return await
      'no-return-await': 'off',
      // 允许使用复杂的数组解构
      'unicorn/no-unreadable-array-destructuring': 'off',
      // 允许在相等判断中使用 !
      'unicorn/no-negation-in-equality-check': 'off',
      // Structured 无法处理代理对象
      'unicorn/prefer-structured-clone': 'off',
      // 允许默认导出匿名函数
      'unicorn/no-anonymous-default-export': 'off',
      // 允许匿名默认导出
      'import-x/no-anonymous-default-export': 'off',
      // 允许括号 await
      'unicorn/no-await-expression-member': 'off',
      // 不强制使用展开运算符
      'unicorn/prefer-spread': 'off',
      // Import 不同分组之间加上空行
      'import-x/order': ['warn', { 'newlines-between': 'always' }],
      // 使用 process
      'n/prefer-global/process': ['error', 'always'],
      // 禁止变量遮蔽
      'no-shadow': ['error', { ignoreOnInitialization: true, allow: ['_'] }],
      // 禁止加空格
      '@stylistic/padding-line-between-statements': 'off',
      // 禁止禁止使用指定类型
      '@typescript-eslint/no-restricted-types': 'off',
      //
      // 项目特有的规则
      //
      // 允许正常调用异步函数并使用 catch
      'unicorn/prefer-top-level-await': 'off',
      // 允许调用大写开头的函数
      'new-cap': ['error', { capIsNew: false }],
      // 允许未分配导入
      'import-x/no-unassigned-import': 'off',
      // 不强制使用 addEventListener
      'unicorn/prefer-add-event-listener': 'off',
      // 允许使用 js url
      'solid/jsx-no-script-url': 'off',
      'solid/reactivity': 'off',
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['helper/**/*', '!helper/languages'],
              message: '只能直接通过 helper 导入',
            },
            { group: ['**/request', '!request'], message: '必须直接导入' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    rules: {
      // 允许在 void 的函数内 return
      '@typescript-eslint/no-confusing-void-expression': 'off',
      // 不限制变量名的大小写样式
      '@typescript-eslint/naming-convention': 'off',
      // 不限制类型断言的方式
      '@typescript-eslint/consistent-type-assertions': 'off',
      // 不限制类型定义的方式
      '@typescript-eslint/consistent-type-definitions': 'off',
      // 不强制使用 for of
      '@typescript-eslint/prefer-for-of': 'off',
      // 不禁止类型
      '@typescript-eslint/ban-types': 'off',
      // 不强制返回 Promise 的函数使用 async
      '@typescript-eslint/promise-function-async': 'off',
      // 不强制换行
      '@typescript-eslint/padding-line-between-statements': 'off',

      // 允许 switch 省略部分值
      '@typescript-eslint/switch-exhaustiveness-check': 'off',
      // 允许浮动 Promise
      '@typescript-eslint/no-floating-promises': 'off',
      // 允许使用空函数
      '@typescript-eslint/no-empty-function': 'off',
      // 允许使用 any
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',

      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',

      // 允许 return await
      '@typescript-eslint/return-await': [
        'off',
        'error-handling-correctness-only',
      ],

      // 在判断类型时允许使用 ||
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: true },
      ],

      // 允许短路表达式
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true },
      ],

      // 允许使用 require
      'unicorn/prefer-module': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          // 允许 typeof import
          disallowTypeAnnotations: false,
          // 使用 内联类型导入
          fixStyle: 'inline-type-imports',
        },
      ],
    },
  },
  {
    files: 'src/site/**/*',
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: [
                '*/**/*',
                '!solid-js/**/*',
                '!components/**/*',
                '!userscript/**/*',
                '!@material*/**/*',
                '../**/*',
                '!.*/**/*',
              ],
              message: '只能通过 main 导入',
            },
          ],
        },
      ],
      'solid/components-return-once': 'off',
    },
  },
];

export default xoConfig;
