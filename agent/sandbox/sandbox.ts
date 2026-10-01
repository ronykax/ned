import { installComputerUse, startComputerUse } from "eve/computer-use/sandbox";
import { defineSandbox } from "eve/sandbox";
import { MicrosandboxSandbox } from "eve/sandbox/microsandbox";

export const environment = MicrosandboxSandbox.dockerfile({
  prepare: async (sandbox) => {
    await installComputerUse(sandbox);
  },
});

export default defineSandbox(async () => {
  const sandbox = await environment.open();
  await startComputerUse(sandbox);

  return sandbox;
});
