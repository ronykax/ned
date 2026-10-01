import { defineSandbox } from "eve/sandbox";
import { MicrosandboxSandbox } from "eve/sandbox/microsandbox";

export const environment = MicrosandboxSandbox.dockerfile({
  env: { balls: "abc123" },
});

export default defineSandbox(() => environment.open());
