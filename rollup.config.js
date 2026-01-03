// ============================================
// 高级定制版 Rollup 配置
// 包含代码分析、多环境构建、优化等高级功能
// ============================================

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve as pathResolve } from 'path';

// ES Module 环境下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// 环境变量
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
const isWatch = process.env.ROLLUP_WATCH === 'true';
const isAnalyze = process.env.ANALYZE === 'true';

// Banner
const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * (c) ${new Date().getFullYear()} ${pkg.author || ''}
 * Released under the ${pkg.license || 'MIT'} License
 */`;

// ============================================
// 高级插件配置
// ============================================

// 代码分析插件（可选）
const analyzePlugin = () => {
  if (!isAnalyze) return null;

  return {
    name: 'analyze',
    generateBundle(options, bundle) {
      const analysis = Object.entries(bundle).map(([name, info]) => {
        if (info.type === 'chunk') {
          return {
            name,
            size: info.code.length,
            modules: Object.keys(info.modules).length,
          };
        }
        return null;
      }).filter(Boolean);

      console.log('\n📊 Bundle Analysis:');
      console.table(analysis);
    },
  };
};

// 进度插件
const progressPlugin = () => {
  if (!isWatch) return null;

  let count = 0;
  return {
    name: 'progress',
    buildStart() {
      count++;
      console.log(`\n🔨 Build #${count} started...`);
    },
    buildEnd() {
      console.log(`✅ Build #${count} completed!\n`);
    },
  };
};

// 文件大小报告插件
const fileSizePlugin = () => {
  return {
    name: 'file-size',
    generateBundle(options, bundle) {
      const sizes = {};

      Object.entries(bundle).forEach(([name, info]) => {
        if (info.type === 'chunk' || info.type === 'asset') {
          const size = info.code?.length || info.source?.length || 0;
          const kb = (size / 1024).toFixed(2);
          sizes[name] = `${kb} KB`;
        }
      });

      if (isProd) {
        console.log('\n📦 Output Files:');
        console.table(sizes);
      }
    },
  };
};

// ============================================
// 外部依赖和全局变量
// ============================================

const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'vue',
  'zustand',
  'zustand/vanilla',
];

const globals = {
  'react': 'React',
  'react-dom': 'ReactDOM',
  'react/jsx-runtime': 'jsxRuntime',
  'vue': 'Vue',
  'zustand': 'zustand',
  'zustand/vanilla': 'zustandVanilla',
};

// ============================================
// 插件配置工厂
// ============================================

const createPlugins = ({
  tsconfig = './tsconfig.json',
  emitDeclaration = false,
  minify = false,
  format = 'esm',
} = {}) => {
  const plugins = [
    // JSON 支持
    json(),

    // 路径别名解析
    {
      name: 'alias',
      resolveId(source) {
        if (source.startsWith('@/')) {
          return pathResolve(__dirname, 'src', source.slice(2));
        }
        return null;
      },
    },

    // Node 模块解析
    resolve({
      browser: format === 'umd',
      preferBuiltins: false,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    }),

    // CommonJS 转换
    commonjs({
      include: /node_modules/,
      requireReturnsDefault: 'auto',
    }),

    // TypeScript 编译
    typescript({
      tsconfig,
      declaration: emitDeclaration,
      declarationDir: emitDeclaration ? './dist' : undefined,
      sourceMap: true,
      inlineSources: isDev,
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/__tests__/**',
        'node_modules/**',
        'dist/**',
      ],
      compilerOptions: {
        declarationMap: emitDeclaration,
        removeComments: isProd,
      },
    }),

    // 进度显示
    progressPlugin(),

    // 代码分析
    analyzePlugin(),

    // 文件大小报告
    fileSizePlugin(),
  ].filter(Boolean);

  // 生产环境压缩
  if (minify && isProd) {
    plugins.push(
      terser({
        compress: {
          drop_console: false,
          drop_debugger: true,
          pure_funcs: ['console.debug', 'console.trace'],
          passes: 2,
        },
        mangle: {
          properties: {
            regex: /^_private_/,
          },
        },
        format: {
          comments: /^!/,
          preamble: banner,
        },
      })
    );
  }

  return plugins;
};

// ============================================
// 输出配置工厂
// ============================================

const createOutput = ({
  file,
  format,
  name = undefined,
  minify = false,
} = {}) => {
  const config = {
    file,
    format,
    name,
    banner: !minify ? banner : undefined,
    sourcemap: isDev ? 'inline' : true,
    exports: 'named',
    globals,
    compact: minify,
    externalLiveBindings: false,
    freeze: false,
    generatedCode: {
      constBindings: true,
      objectShorthand: true,
      arrowFunctions: true,
    },
  };

  // 开发环境优化
  if (isDev) {
    config.indent = true;
    config.sourcemapExcludeSources = false;
  }

  // ESM 特定配置
  if (format === 'esm') {
    config.preserveModules = isDev; // 开发环境保留模块结构
    config.preserveModulesRoot = 'src';
  }

  return config;
};

// ============================================
// 构建配置生成器
// ============================================

const createBuildConfig = ({
  input,
  outputDir,
  moduleName,
  externalDeps = [],
  emitDeclaration = true,
} = {}) => {
  const outputs = [
    // ESM 格式
    createOutput({
      file: `${outputDir}/index.esm.js`,
      format: 'esm',
    }),

    // CommonJS 格式
    createOutput({
      file: `${outputDir}/index.cjs.js`,
      format: 'cjs',
    }),
  ];

  // 生产环境添加 UMD 格式
  if (isProd) {
    outputs.push(
      createOutput({
        file: `${outputDir}/index.umd.js`,
        format: 'umd',
        name: moduleName,
        minify: true,
      })
    );
  }

  return {
    input,
    external: (id) => {
      return (
        external.includes(id) ||
        external.some(ext => id.startsWith(`${ext}/`)) ||
        externalDeps.includes(id) ||
        externalDeps.some(dep => id.startsWith(`${dep}/`))
      );
    },
    output: outputs,
    plugins: createPlugins({
      emitDeclaration,
      minify: true,
    }),
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
    onwarn(warning, warn) {
      // 忽略某些警告
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;
      if (warning.code === 'THIS_IS_UNDEFINED') return;
      if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;

      // 输出其他警告
      warn(warning);
    },
  };
};

// ============================================
// 类型声明配置
// ============================================

const createDtsConfig = ({
  input,
  output,
  externalDeps = [],
} = {}) => ({
  input,
  output: {
    file: output,
    format: 'esm',
    banner,
  },
  external: (id) => {
    return (
      external.includes(id) ||
      external.some(ext => id.startsWith(`${ext}/`)) ||
      externalDeps.includes(id) ||
      externalDeps.some(dep => id.startsWith(`${dep}/`))
    );
  },
  plugins: [
    dts({
      respectExternal: true,
      compilerOptions: {
        removeComments: isProd,
      },
    }),
  ],
});

// ============================================
// 所有模块配置
// ============================================

const configs = [];

// 1. 核心层
configs.push(
  createBuildConfig({
    input: 'src/core/index.ts',
    outputDir: 'dist/core',
    moduleName: 'WebSocketCore',
  }),
  createDtsConfig({
    input: 'src/core/index.ts',
    output: 'dist/core/index.d.ts',
  })
);

// 2. React 适配层
configs.push(
  createBuildConfig({
    input: 'src/adapters/react-adapter.tsx',
    outputDir: 'dist/adapters',
    moduleName: 'WebSocketReact',
    externalDeps: ['../core'],
  }),
  createDtsConfig({
    input: 'src/adapters/react-adapter.tsx',
    output: 'dist/adapters/react-adapter.d.ts',
    externalDeps: ['../core'],
  })
);

// 3. Vue 适配层
configs.push(
  createBuildConfig({
    input: 'src/adapters/vue-adapter.ts',
    outputDir: 'dist/adapters',
    moduleName: 'WebSocketVue',
    externalDeps: ['../core'],
  }),
  createDtsConfig({
    input: 'src/adapters/vue-adapter.ts',
    output: 'dist/adapters/vue-adapter.d.ts',
    externalDeps: ['../core'],
  })
);

// 4. Store 层
configs.push(
  createBuildConfig({
    input: 'src/store/index.ts',
    outputDir: 'dist/store',
    moduleName: 'WebSocketStore',
    externalDeps: ['../core'],
  }),
  createDtsConfig({
    input: 'src/store/index.ts',
    output: 'dist/store/store-layer.d.ts',
    externalDeps: ['../core'],
  })
);

// 5. 主入口
configs.push(
  createBuildConfig({
    input: 'src/index.ts',
    outputDir: 'dist',
    moduleName: 'WebSocketClient',
  }),
  createDtsConfig({
    input: 'src/index.ts',
    output: 'dist/index.d.ts',
  })
);

// ============================================
// 开发环境信息
// ============================================

if (isDev || isWatch) {
  console.log('\n🚀 Development Mode');
  console.log('📁 Output:', 'dist/');
  console.log('🔍 Watch:', isWatch ? 'Enabled' : 'Disabled');
  console.log('📊 Analyze:', isAnalyze ? 'Enabled' : 'Disabled\n');
}

export default configs;