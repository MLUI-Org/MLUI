import { registerHyperparametersNode } from "./HyperparametersNode";
import { registerImportsNode } from "./ImportsNode";
import { registerMLModelNode } from "./MLModelNode";
import { registerMLModelRunNode } from "./MLModelRunNode";
import { registerOrchestratorGlobalsNode } from "./OrchestratorGlobalsNode";
import { registerOrchestratorVaeNode } from "./OrchestratorVaeNode";
import { registerTensorNormalizeNode } from "./TensorNormalizeNode";
import { registerTensorSourceNode } from "./TensorSourceNode";
import { registerVaeClassNode } from "./VaeClassNode";
import { registerVaeDecodeNode } from "./VaeDecodeNode";
import { registerVaeEncodeNode } from "./VaeEncodeNode";
import { registerVaeRoundtripNode } from "./VaeRoundtripNode";

export function ensureDemoNodesRegistered() {
  registerImportsNode();
  registerHyperparametersNode();
  registerOrchestratorGlobalsNode();
  registerOrchestratorVaeNode();
  registerMLModelNode();
  registerMLModelRunNode();
  registerTensorSourceNode();
  registerTensorNormalizeNode();
  registerVaeClassNode();
  registerVaeEncodeNode();
  registerVaeDecodeNode();
  registerVaeRoundtripNode();
}
