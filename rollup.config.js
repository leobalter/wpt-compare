import typescript from '@rollup/plugin-typescript';

export default {
    input: ['src/registry.ts'],
    output: {
        dir: 'lib/',
        format: 'esm'
    },
    plugins: [typescript({lib: ['es6', 'dom'], target: 'es2015'})]
};
