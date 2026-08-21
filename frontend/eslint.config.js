// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // `Alert` from react-native is BANNED in app code.
    //
    // On web, `react-native-web` exports `class Alert { static alert() {} }` — an
    // empty method. Six destructive confirms in settings were written against it
    // and did nothing at all on web: no dialog, no request, no console error. The
    // failure is silent in both directions, which is why it survived a full test
    // suite and needs a lint rule rather than vigilance.
    //
    // Two kinds of file are exempt, and only two:
    //
    //  - `utils/alert.ts` — the shim itself. It branches on `Platform.OS` and
    //    uses `window.confirm` on web, so it has to import the thing it wraps.
    //  - `__tests__/**` — jest runs with `testEnvironment: 'node'`, so
    //    `Platform.OS !== 'web'` and the shim takes its native branch. Those
    //    suites assert `Alert.alert` was called *through* the shim, which is
    //    real coverage of the native path. Note what it is NOT: it cannot catch
    //    a web-only regression, because the broken branch is never executed.
    //    Journey 17 is the web coverage. Exempting tests is safe only because
    //    the ban on app code above is absolute — a screen cannot reach `Alert`
    //    to be tested wrongly in the first place.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['utils/alert.ts', '__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Alert'],
              message:
                "react-native's Alert is a no-op on web (react-native-web exports an empty " +
                'static method), so confirms and error messages silently do nothing. Import ' +
                'showAlert / showConfirm / showError from @/utils/alert instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // Neither of these directories contains React. `e2e/` is Playwright, whose
    // fixture callback is named `use`, and `test-utils/mock-navigation.ts`
    // reaches into the jest mocks behind `useRouter` / `useNavigation` from
    // plain helper functions. The hooks rule matches on the name alone, so it
    // reads all three as components calling hooks illegally. They are not
    // components, and there is no render to break.
    files: ['e2e/**/*.ts', 'test-utils/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
]);
