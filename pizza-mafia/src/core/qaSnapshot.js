// Read-only observations for deterministic UI tests. No setters, rewards or save injection.
export function attachQASnapshot(game, platform) {
  Object.defineProperty(window, 'GameQA', {
    configurable: true,
    value: Object.freeze({
      snapshot() {
        return JSON.parse(JSON.stringify({
          schema: 1,
          scenes: game.scene.getScenes(true).map(scene => scene.sys.settings.key),
          gameplayActive: platform.gameplayActive,
          progress: platform.cache,
          platform: platform.name,
        }));
      },
    }),
  });
}
