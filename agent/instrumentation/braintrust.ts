import { braintrustEveInstrumentation, initLogger } from "braintrust";

export default braintrustEveInstrumentation({
  metadata: {
    app: "ned",
  },
  setup: ({ agentName }) => {
    initLogger({
      apiKey: process.env.BRAINTRUST_API_KEY,
      projectName: agentName,
    });
  },
});
