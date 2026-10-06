import { defineSandbox } from "eve/sandbox";
import { Drive, VercelSandbox } from "eve/sandbox/vercel";

export const environment = VercelSandbox.environment();

export default defineSandbox(async () => {
  const drive = await Drive.getOrCreate({ name: "ned-shared" });
  return environment.open({
    mounts: { "/shared": drive },
    networkPolicy: "allow-all",
    resources: { vcpus: 4 },
  });
});
