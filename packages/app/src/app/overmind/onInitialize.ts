import { OnInitialize } from '.';

export const onInitialize: OnInitialize = async (
  { state, effects, actions },
  overmindInstance
) => {
  const provideJwtToken = () => state.jwt || effects.jwt.get();

  state.isFirstVisit = Boolean(
    !effects.jwt.get() && !effects.browser.storage.get('hasVisited')
  );

  effects.browser.storage.set('hasVisited', true);

  effects.live.initialize({
    provideJwtToken,
    onApplyOperation: actions.live.applyTransformation,
  });

  effects.flows.initialize(overmindInstance.reaction);

  effects.api.initialize({
    provideJwtToken,
    getParsedConfigurations() {
      return state.editor.parsedConfigurations;
    },
  });

  effects.gql.initialize(
    {
      endpoint: `${location.origin}/api/graphql`,
      headers: () => ({
        Authorization: `Bearer ${state.jwt}`,
      }),
    },
    // TODO(@christianalfoni): we need to make this dynamic, but overmind devtools can't serialize a socket with one channel.
    // Because of this the app crashes if we want to provide it with a function
    effects.jwt.get() ? effects.live.getSocket() : null
  );

  effects.notifications.initialize({
    provideSocket() {
      return effects.live.getSocket();
    },
  });

  effects.zeit.initialize({
    getToken() {
      return state.user?.integrations.zeit?.token ?? null;
    },
  });

  effects.netlify.initialize({
    getUserId() {
      return state.user?.id ?? null;
    },
  });

  effects.prettyfier.initialize({
    getCurrentModule() {
      return state.editor.currentModule;
    },
    getPrettierConfig() {
      let config = state.preferences.settings.prettierConfig;
      const configFromSandbox = state.editor.currentSandbox?.modules.find(
        module =>
          module.directoryShortid == null && module.title === '.prettierrc'
      );

      if (configFromSandbox) {
        config = JSON.parse(configFromSandbox.code);
      }

      return config;
    },
  });

  effects.vscode.initialize({
    getCurrentSandbox: () => state.editor.currentSandbox,
    getCurrentModule: () => state.editor.currentModule,
    getSandboxFs: () => state.editor.modulesByPath,
    getCurrentUser: () => state.user,
    onOperationApplied: actions.editor.onOperationApplied,
    onCodeChange: actions.editor.codeChanged,
    onSelectionChange: actions.live.onSelectionChanged,
    reaction: overmindInstance.reaction,
    getState: path =>
      path ? path.split('.').reduce((aggr, key) => aggr[key], state) : state,
    getSignal: path =>
      path.split('.').reduce((aggr, key) => aggr[key], actions),
  });

  effects.preview.initialize(overmindInstance.reaction);
};
