import { useEffect, useRef, useState } from "react";

import { LGraph, LGraphCanvas } from "@mlui/litegraph";
import { attachCodeEditorOverlay, attachSelectionToolbar } from "@mlui/litegraph-addons";
import {
  ImportsNode,
  MLModelNode,
  MLModelRunNode,
  OrchestratorGlobalsNode,
  OrchestratorVaeNode,
  TensorSourceNode,
  VaeClassNode,
  VaeDecodeNode,
  VaeEncodeNode,
  compileWorkflowToPython,
  ensureDemoNodesRegistered,
} from "@mlui/litegraph-nodes";

function createDemoGraph(canvas: HTMLCanvasElement) {
  ensureDemoNodesRegistered();

  const graph = new LGraph();
  const imports = new ImportsNode();
  const source = new TensorSourceNode();
  const vae = new VaeClassNode();
  const encode = new VaeEncodeNode();
  const decode = new VaeDecodeNode();
  const orch1 = new OrchestratorGlobalsNode();
  const orch2 = new OrchestratorVaeNode();
  const model = new MLModelNode();
  const runModel = new MLModelRunNode();

  graph.add(imports);
  graph.add(source);
  graph.add(vae);
  graph.add(encode);
  graph.add(decode);
  graph.add(orch1);
  graph.add(orch2);
  graph.add(model);
  graph.add(runModel);
  vae.connect(0, encode, 0);
  vae.connect(0, decode, 0);
  orch1.connect(0, orch2, 0);
  vae.connect(1, orch2, 1);
  orch2.connect(0, model, 0);
  model.connect(0, runModel, 0);
  source.connect(0, runModel, 1);

  const graphCanvas = new LGraphCanvas(canvas, graph);
  graphCanvas.background_image = null;
  graphCanvas.render_connections_border = true;
  graphCanvas.getCanvasMenuOptions = () => [];
  graphCanvas.getNodeMenuOptions = () => [];
  graphCanvas.processContextMenu = () => {};
  graphCanvas.setDirty(true, true);

  return { graph, graphCanvas };
}

function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <div className="window-chrome">
      <div className="window-drag-region" />
      <div className="window-controls" aria-label="Window controls">
        <button
          className="window-control minimize"
          type="button"
          aria-label="Minimize window"
          onClick={() => {
            void window.mlui.window.minimize();
          }}
        />
        <button
          className={`window-control maximize${isMaximized ? " is-maximized" : ""}`}
          type="button"
          aria-label="Toggle window size"
          onClick={async () => {
            const nextState = await window.mlui.window.toggleMaximize();
            setIsMaximized(nextState);
          }}
        />
        <button
          className="window-control close"
          type="button"
          aria-label="Close window"
          onClick={() => {
            void window.mlui.window.close();
          }}
        />
      </div>
    </div>
  );
}

function CompilePanel({ graph }: { graph: LGraph | null }) {
  const [status, setStatus] = useState("Ready to compile");

  return (
    <div className="compile-panel">
      <button
        className="compile-panel__button"
        type="button"
        onClick={async () => {
          if (!graph) return;

          const result = compileWorkflowToPython(graph);
          if (!result.ok) {
            setStatus(result.errors.join("\n"));
            return;
          }

          const outputPath = await window.mlui.workflow.writePython(result.python);
          setStatus(`Wrote ${outputPath}`);
        }}
      >
        Compile Python
      </button>
      <pre className="compile-panel__status">{status}</pre>
    </div>
  );
}

export function App() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [graph, setGraph] = useState<LGraph | null>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return;

    const { graph, graphCanvas } = createDemoGraph(canvas);
    setGraph(graph);
    const detachSelectionToolbar = attachSelectionToolbar({
      graphCanvas,
      host: shell,
    });
    const detachCodeEditorOverlay = attachCodeEditorOverlay({
      graphCanvas,
      host: shell,
    });
    let frameId = 0;

    const previousOnChange = graph.on_change;
    graph.on_change = (currentGraph) => {
      previousOnChange?.(currentGraph);
      window.__MLUI_GRAPH_STATE_JSON__ = JSON.stringify(currentGraph.serialize(), null, 2);
    };
    window.__MLUI_GRAPH_STATE_JSON__ = JSON.stringify(graph.serialize(), null, 2);

    const resizeCanvas = () => {
      frameId = 0;

      const width = Math.floor(shell.clientWidth);
      const height = Math.floor(shell.clientHeight);

      if (width <= 0 || height <= 0) return;

      graphCanvas.resize(width, height);
      graphCanvas.draw(true, true);
    };

    const scheduleResize = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(resizeCanvas);
    };

    scheduleResize();

    const resizeObserver = new ResizeObserver(() => {
      scheduleResize();
    });
    resizeObserver.observe(shell);

    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("resize", scheduleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("resize", scheduleResize);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      delete window.__MLUI_GRAPH_STATE_JSON__;
      setGraph(null);
      graph.on_change = previousOnChange;
      detachCodeEditorOverlay();
      detachSelectionToolbar();
      graphCanvas.setDirty(false, false);
    };
  }, []);

  return (
    <div ref={shellRef} className="shell">
      <WindowControls />
      <canvas ref={canvasRef} id="graph-canvas" />
      <CompilePanel graph={graph} />
    </div>
  );
}

function preventContextMenu(event: MouseEvent) {
  event.preventDefault();
}
