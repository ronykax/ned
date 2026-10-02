import { installComputerUse, startComputerUse } from "eve/computer-use/sandbox";
import { defineSandbox } from "eve/sandbox";
import { DockerSandbox } from "eve/sandbox/docker";

export const environment = DockerSandbox.environment({
  prepare: async (sandbox) => {
    await installComputerUse(sandbox);
  },
});

export default defineSandbox(async () => {
  const sandbox = await environment.open({ networkPolicy: "allow-all" });
  await startComputerUse(sandbox);

  return sandbox;
});
