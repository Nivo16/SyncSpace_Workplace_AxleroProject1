import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Ellipse, Line, Text, Transformer} from "react-konva";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import WhiteboardToolbar from "./WhiteboardToolbar";
import {getWorkspaceDocument, saveWorkspaceDocument} from "../data/workspaceStore";
import { getCurrentUserName } from "../data/currentUser";
import "./Whiteboard.css";

function Whiteboard({ workspaceId, onActivity }) {
  const containerRef = useRef(null);
  const transformerRef = useRef(null);

  const savedWhiteboard =
    getWorkspaceDocument(workspaceId).whiteboardState || {};

  const [size, setSize] = useState({
    width: 500,
    height: 500
  });

  const [selectedTool, setSelectedTool] =
    useState("select");

  const [rectangles, setRectangles] = useState(
    savedWhiteboard.rectangles || []
  );

  const [circles, setCircles] = useState(
    savedWhiteboard.circles || []
  );

  const [lines, setLines] = useState(
    savedWhiteboard.lines || []
  );

  const [freehandLines, setFreehandLines] =
    useState(
      savedWhiteboard.freehandLines || []
    );

  const [texts, setTexts] = useState(
    savedWhiteboard.texts || []
  );

  const [selectedObject, setSelectedObject] =
    useState(null);

  const [newRectangle, setNewRectangle] =
    useState(null);

  const [newCircle, setNewCircle] =
    useState(null);

  const [newLine, setNewLine] =
    useState(null);

  const [newFreehandLine, setNewFreehandLine] =
    useState(null);

  const [history, setHistory] = useState([]);

  const [historyIndex, setHistoryIndex] =
    useState(-1);

  const [remoteCursors, setRemoteCursors] =
    useState({});

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const yShapesRef = useRef(null);

  useEffect(() => {
    const ydoc = new Y.Doc();

    const provider = new SocketIOProvider(
      "http://localhost:5000",
      `whiteboard-${workspaceId || "default"}`,
      ydoc,
      {
        autoConnect: true, auth: { token: window.localStorage.getItem("syncspace-token") }
      }
    );

    const yShapes =
      ydoc.getArray("shapes");

    ydocRef.current = ydoc;
    providerRef.current = provider;
    yShapesRef.current = yShapes;

    const applyRemoteShapes = () => {
      const all = yShapes.toArray();

      setRectangles(
        all.filter(
          (shape) =>
            shape.type === "rectangle"
        )
      );

      setCircles(
        all.filter(
          (shape) =>
            shape.type === "circle"
        )
      );

      setLines(
        all.filter(
          (shape) =>
            shape.type === "line"
        )
      );

      setFreehandLines(
        all.filter(
          (shape) =>
            shape.type === "freehand"
        )
      );

      setTexts(
        all.filter(
          (shape) =>
            shape.type === "text"
        )
      );
    };

    yShapes.observe(
      applyRemoteShapes
    );

    provider.on(
      "sync",
      (isSynced) => {
        if (
          isSynced &&
          yShapes.length === 0
        ) {
          const local = [
            ...rectangles.map(
              (shape) => ({
                ...shape,
                type: "rectangle"
              })
            ),

            ...circles.map(
              (shape) => ({
                ...shape,
                type: "circle"
              })
            ),

            ...lines.map(
              (shape) => ({
                ...shape,
                type: "line"
              })
            ),

            ...freehandLines.map(
              (shape) => ({
                ...shape,
                type: "freehand"
              })
            ),

            ...texts.map(
              (shape) => ({
                ...shape,
                type: "text"
              })
            )
          ];

          if (local.length > 0) {
            yShapes.push(local);
          }
        }
      }
    );

    const awareness =
      provider.awareness;

    const userName =
      getCurrentUserName() ||
      "Anonymous";

    const userColor = `hsl(${
      Math.abs(
        userName
          .split("")
          .reduce(
            (total, character) =>
              total +
              character.charCodeAt(0),
            0
          )
      ) % 360
    }, 70%, 55%)`;

    awareness.setLocalStateField(
      "user",
      {
        name: userName,
        color: userColor
      }
    );

    const handleAwarenessChange =
      () => {
        const states =
          awareness.getStates();

        const cursors = {};

        states.forEach(
          (
            state,
            clientId
          ) => {
            if (
              clientId ===
              awareness.clientID
            ) {
              return;
            }

            if (state.cursor) {
              cursors[clientId] = {
                ...state.cursor,
                name:
                  state.user?.name ||
                  "Anonymous",
                color:
                  state.user?.color ||
                  "#888"
              };
            }
          }
        );

        setRemoteCursors(
          cursors
        );
      };

    awareness.on(
      "change",
      handleAwarenessChange
    );

    return () => {
      yShapes.unobserve(
        applyRemoteShapes
      );

      awareness.off(
        "change",
        handleAwarenessChange
      );

      provider.disconnect();
      ydoc.destroy();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const pushShapeToYjs = (
    type,
    shape
  ) => {
    const yShapes =
      yShapesRef.current;

    if (!yShapes) {
      return;
    }

    yShapes.push([
      {
        ...shape,
        type
      }
    ]);
  };

  const updateShapeInYjs = (
    id,
    updates
  ) => {
    const yShapes =
      yShapesRef.current;

    if (!yShapes) {
      return;
    }

    const index =
      yShapes
        .toArray()
        .findIndex(
          (shape) =>
            String(shape.id) ===
            String(id)
        );

    if (index === -1) {
      return;
    }

    const existing =
      yShapes.get(index);

    yShapes.delete(
      index,
      1
    );

    yShapes.insert(
      index,
      [
        {
          ...existing,
          ...updates
        }
      ]
    );
  };

  const deleteShapeFromYjs =
    (id) => {
      const yShapes =
        yShapesRef.current;

      if (!yShapes) {
        return;
      }

      const index =
        yShapes
          .toArray()
          .findIndex(
            (shape) =>
              String(shape.id) ===
              String(id)
          );

      if (index !== -1) {
        yShapes.delete(
          index,
          1
        );
      }
    };

  const clearShapesInYjs =
    () => {
      const yShapes =
        yShapesRef.current;

      if (!yShapes) {
        return;
      }

      yShapes.delete(
        0,
        yShapes.length
      );
    };

  const saveToHistory = (
    r,
    c,
    l,
    f,
    t
  ) => {
    const newState = {
      rectangles: r,
      circles: c,
      lines: l,
      freehandLines: f,
      texts: t
    };

    setHistory(
      (previous) => [
        ...previous.slice(
          0,
          historyIndex + 1
        ),
        newState
      ]
    );

    setHistoryIndex(
      (previous) =>
        previous + 1
    );
  };

  const handleSave = () => {
    saveWorkspaceDocument(
      workspaceId,
      {
        whiteboard: [
          ...rectangles,
          ...circles,
          ...lines,
          ...freehandLines,
          ...texts
        ],

        whiteboardState: {
          rectangles,
          circles,
          lines,
          freehandLines,
          texts
        }
      }
    );

    onActivity(
      "Saved the whiteboard",
      "whiteboard"
    );
  };

  useEffect(() => {
    const transformer =
      transformerRef.current;

    if (!transformer) {
      return;
    }

    const node =
      selectedTool === "select" &&
      selectedObject
        ? transformer
            .getStage()
            ?.findOne(
              `#${selectedObject}`
            )
        : null;

    transformer.nodes(
      node ? [node] : []
    );

    transformer
      .getLayer()
      ?.batchDraw();
  }, [
    selectedObject,
    selectedTool,
    rectangles,
    circles,
    lines,
    freehandLines,
    texts
  ]);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) {
        return;
      }

      setSize({
        width:
          containerRef.current
            .offsetWidth,

        height:
          containerRef.current
            .offsetHeight
      });
    };

    updateSize();

    window.addEventListener(
      "resize",
      updateSize
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateSize
      );
    };
  }, []);

  const handleMouseDown = (
    event
  ) => {
    if (
      selectedTool ===
        "select" ||
      selectedTool ===
        "eraser"
    ) {
      return;
    }

    const stage =
      event.target.getStage();

    const pointer =
      stage.getPointerPosition();

    if (!pointer) {
      return;
    }

    if (
      selectedTool ===
      "rectangle"
    ) {
      setNewRectangle({
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0
      });

      return;
    }

    if (
      selectedTool ===
      "circle"
    ) {
      setNewCircle({
        x: pointer.x,
        y: pointer.y,
        radiusX: 0,
        radiusY: 0
      });

      return;
    }

    if (
      selectedTool ===
      "line"
    ) {
      setNewLine({
        points: [
          pointer.x,
          pointer.y,
          pointer.x,
          pointer.y
        ]
      });

      return;
    }

    if (
      selectedTool ===
      "pen"
    ) {
      setNewFreehandLine({
        points: [
          pointer.x,
          pointer.y
        ]
      });

      return;
    }

    if (
      selectedTool ===
      "text"
    ) {
      const userText =
        window.prompt(
          "Enter your text:"
        );

      if (
        !userText ||
        !userText.trim()
      ) {
        return;
      }

      const newText = {
        id:
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,

        x: pointer.x,
        y: pointer.y,

        text:
          userText.trim(),

        fontSize: 20
      };

      const updatedTexts = [
        ...texts,
        newText
      ];

      setTexts(
        updatedTexts
      );

      pushShapeToYjs(
        "text",
        newText
      );

      saveToHistory(
        rectangles,
        circles,
        lines,
        freehandLines,
        updatedTexts
      );

      setSelectedObject(
        newText.id.toString()
      );

      return;
    }
  };

  const handleCanvasClick = (
    event
  ) => {
    if (
      selectedTool ===
      "eraser"
    ) {
      handleErase(event);
      return;
    }

    if (
      selectedTool !==
      "select"
    ) {
      return;
    }

    const target =
      event.target;

    if (
      target ===
      target.getStage()
    ) {
      setSelectedObject(
        null
      );

      return;
    }

    setSelectedObject(
      target.id() ||
        null
    );
  };

  const handleTransformEnd = (
    event
  ) => {
    const node =
      event.target;

    const id =
      node.id();

    const type =
      node.name();

    const scaleX =
      node.scaleX();

    const scaleY =
      node.scaleY();

    const x =
      node.x();

    const y =
      node.y();

    if (
      type ===
      "rectangle"
    ) {
      const updated =
        rectangles.map(
          (item) =>
            String(item.id) ===
            String(id)
              ? {
                  ...item,
                  x,
                  y,

                  width:
                    Math.max(
                      8,
                      item.width *
                        scaleX
                    ),

                  height:
                    Math.max(
                      8,
                      item.height *
                        scaleY
                    )
                }
              : item
        );

      node.scale({
        x: 1,
        y: 1
      });

      setRectangles(
        updated
      );

      const current =
        updated.find(
          (item) =>
            String(item.id) ===
            String(id)
        );

      if (current) {
        updateShapeInYjs(
          id,
          {
            x: current.x,
            y: current.y,
            width:
              current.width,
            height:
              current.height
          }
        );
      }

      saveToHistory(
        updated,
        circles,
        lines,
        freehandLines,
        texts
      );
    }

    if (
      type ===
      "circle"
    ) {
      const updated =
        circles.map(
          (item) =>
            String(item.id) ===
            String(id)
              ? {
                  ...item,
                  x,
                  y,

                  radiusX:
                    Math.max(
                      6,
                      item.radiusX *
                        scaleX
                    ),

                  radiusY:
                    Math.max(
                      6,
                      item.radiusY *
                        scaleY
                    )
                }
              : item
        );

      node.scale({
        x: 1,
        y: 1
      });

      setCircles(
        updated
      );

      const current =
        updated.find(
          (item) =>
            String(item.id) ===
            String(id)
        );

      if (current) {
        updateShapeInYjs(
          id,
          {
            x: current.x,
            y: current.y,
            radiusX:
              current.radiusX,
            radiusY:
              current.radiusY
          }
        );
      }

      saveToHistory(
        rectangles,
        updated,
        lines,
        freehandLines,
        texts
      );
    }

    if (
      type ===
      "text"
    ) {
      const updated =
        texts.map(
          (item) =>
            String(item.id) ===
            String(id)
              ? {
                  ...item,
                  x,
                  y,

                  fontSize:
                    Math.max(
                      8,
                      (item.fontSize ||
                        20) *
                        scaleY
                    )
                }
              : item
        );

      node.scale({
        x: 1,
        y: 1
      });

      setTexts(
        updated
      );

      const current =
        updated.find(
          (item) =>
            String(item.id) ===
            String(id)
        );

      if (current) {
        updateShapeInYjs(
          id,
          {
            x: current.x,
            y: current.y,
            fontSize:
              current.fontSize
          }
        );
      }

      saveToHistory(
        rectangles,
        circles,
        lines,
        freehandLines,
        updated
      );
    }

    if (
      type === "line" ||
      type === "freehand"
    ) {
      const updateItems =
        (items) =>
          items.map(
            (item) =>
              String(item.id) ===
              String(id)
                ? {
                    ...item,
                    x,
                    y,

                    points:
                      item.points.map(
                        (
                          point,
                          index
                        ) =>
                          point *
                          (index %
                            2 ===
                          0
                            ? scaleX
                            : scaleY)
                      )
                  }
                : item
          );

      if (
        type ===
        "line"
      ) {
        const updated =
          updateItems(
            lines
          );

        node.scale({
          x: 1,
          y: 1
        });

        setLines(
          updated
        );

        const current =
          updated.find(
            (item) =>
              String(
                item.id
              ) ===
              String(id)
          );

        if (current) {
          updateShapeInYjs(
            id,
            {
              x: current.x,
              y: current.y,
              points:
                current.points
            }
          );
        }

        saveToHistory(
          rectangles,
          circles,
          updated,
          freehandLines,
          texts
        );
      } else {
        const updated =
          updateItems(
            freehandLines
          );

        node.scale({
          x: 1,
          y: 1
        });

        setFreehandLines(
          updated
        );

        const current =
          updated.find(
            (item) =>
              String(
                item.id
              ) ===
              String(id)
          );

        if (current) {
          updateShapeInYjs(
            id,
            {
              x: current.x,
              y: current.y,
              points:
                current.points
            }
          );
        }

        saveToHistory(
          rectangles,
          circles,
          lines,
          updated,
          texts
        );
      }
    }
  };

  const handleMouseMove = (
    event
  ) => {
    const stage =
      event.target.getStage();

    const cursorPosition =
      stage?.getPointerPosition();

    if (
      cursorPosition &&
      providerRef.current
    ) {
      providerRef.current.awareness.setLocalStateField(
        "cursor",
        {
          x: cursorPosition.x,
          y: cursorPosition.y
        }
      );
    }

    if (
      selectedTool ===
        "select" ||
      selectedTool ===
        "eraser"
    ) {
      return;
    }

    if (!cursorPosition) {
      return;
    }

    if (newRectangle) {
      setNewRectangle({
        ...newRectangle,

        width:
          cursorPosition.x -
          newRectangle.x,

        height:
          cursorPosition.y -
          newRectangle.y
      });
    }

    if (newCircle) {
      setNewCircle({
        ...newCircle,

        radiusX:
          Math.abs(
            cursorPosition.x -
              newCircle.x
          ),

        radiusY:
          Math.abs(
            cursorPosition.y -
              newCircle.y
          )
      });
    }

    if (newLine) {
      setNewLine({
        points: [
          newLine.points[0],
          newLine.points[1],
          cursorPosition.x,
          cursorPosition.y
        ]
      });
    }

    if (
      newFreehandLine
    ) {
      setNewFreehandLine({
        ...newFreehandLine,

        points: [
          ...newFreehandLine.points,
          cursorPosition.x,
          cursorPosition.y
        ]
      });
    }
  };

  const handleMouseUp =
    () => {
      if (
        selectedTool ===
          "select" ||
        selectedTool ===
          "eraser"
      ) {
        return;
      }

      if (newRectangle) {
        const object = {
          ...newRectangle,
          id: Date.now()
        };

        const updated = [
          ...rectangles,
          object
        ];

        setRectangles(
          updated
        );

        pushShapeToYjs(
          "rectangle",
          object
        );

        saveToHistory(
          updated,
          circles,
          lines,
          freehandLines,
          texts
        );

        setNewRectangle(
          null
        );
      }

      if (newCircle) {
        const object = {
          ...newCircle,
          id: Date.now()
        };

        const updated = [
          ...circles,
          object
        ];

        setCircles(
          updated
        );

        pushShapeToYjs(
          "circle",
          object
        );

        saveToHistory(
          rectangles,
          updated,
          lines,
          freehandLines,
          texts
        );

        setNewCircle(
          null
        );
      }

      if (newLine) {
        const object = {
          ...newLine,
          x: 0,
          y: 0,
          id: Date.now()
        };

        const updated = [
          ...lines,
          object
        ];

        setLines(
          updated
        );

        pushShapeToYjs(
          "line",
          object
        );

        saveToHistory(
          rectangles,
          circles,
          updated,
          freehandLines,
          texts
        );

        setNewLine(
          null
        );
      }

      if (
        newFreehandLine
      ) {
        const object = {
          ...newFreehandLine,
          x: 0,
          y: 0,
          id: Date.now()
        };

        const updated = [
          ...freehandLines,
          object
        ];

        setFreehandLines(
          updated
        );

        pushShapeToYjs(
          "freehand",
          object
        );

        saveToHistory(
          rectangles,
          circles,
          lines,
          updated,
          texts
        );

        setNewFreehandLine(
          null
        );
      }
    };

  const handleRectangleDrag =
    (event, id) => {
      setRectangles(
        (previous) =>
          previous.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    x: event.target.x(),
                    y: event.target.y()
                  }
                : item
          )
      );
    };

  const handleRectangleDragEnd =
    (event, id) => {
      const x =
        event.target.x();

      const y =
        event.target.y();

      const updated =
        rectangles.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  x,
                  y
                }
              : item
        );

      setRectangles(
        updated
      );

      updateShapeInYjs(
        id,
        {
          x,
          y
        }
      );

      saveToHistory(
        updated,
        circles,
        lines,
        freehandLines,
        texts
      );
    };

  const handleCircleDrag =
    (event, id) => {
      setCircles(
        (previous) =>
          previous.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    x: event.target.x(),
                    y: event.target.y()
                  }
                : item
          )
      );
    };

  const handleCircleDragEnd =
    (event, id) => {
      const x =
        event.target.x();

      const y =
        event.target.y();

      const updated =
        circles.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  x,
                  y
                }
              : item
        );

      setCircles(
        updated
      );

      updateShapeInYjs(
        id,
        {
          x,
          y
        }
      );

      saveToHistory(
        rectangles,
        updated,
        lines,
        freehandLines,
        texts
      );
    };

  const handleLineDrag =
    (event, id) => {
      setLines(
        (previous) =>
          previous.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    x: event.target.x(),
                    y: event.target.y()
                  }
                : item
          )
      );
    };

  const handleLineDragEnd =
    (event, id) => {
      const x =
        event.target.x();

      const y =
        event.target.y();

      const updated =
        lines.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  x,
                  y
                }
              : item
        );

      setLines(
        updated
      );

      updateShapeInYjs(
        id,
        {
          x,
          y
        }
      );

      saveToHistory(
        rectangles,
        circles,
        updated,
        freehandLines,
        texts
      );
    };

  const handleFreehandDrag =
    (event, id) => {
      setFreehandLines(
        (previous) =>
          previous.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    x: event.target.x(),
                    y: event.target.y()
                  }
                : item
          )
      );
    };

  const handleFreehandDragEnd =
    (event, id) => {
      const x =
        event.target.x();

      const y =
        event.target.y();

      const updated =
        freehandLines.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  x,
                  y
                }
              : item
        );

      setFreehandLines(
        updated
      );

      updateShapeInYjs(
        id,
        {
          x,
          y
        }
      );

      saveToHistory(
        rectangles,
        circles,
        lines,
        updated,
        texts
      );
    };

  const handleTextDrag =
    (event, id) => {
      setTexts(
        (previous) =>
          previous.map(
            (item) =>
              String(item.id) ===
              String(id)
                ? {
                    ...item,
                    x: event.target.x(),
                    y: event.target.y()
                  }
                : item
          )
      );
    };

  const handleTextDragEnd =
    (event, id) => {
      const x =
        event.target.x();

      const y =
        event.target.y();

      const updated =
        texts.map(
          (item) =>
            String(item.id) ===
            String(id)
              ? {
                  ...item,
                  x,
                  y
                }
              : item
        );

      setTexts(
        updated
      );

      updateShapeInYjs(
        id,
        {
          x,
          y
        }
      );

      saveToHistory(
        rectangles,
        circles,
        lines,
        freehandLines,
        updated
      );
    };

  const handleErase =
    (event) => {
      if (
        selectedTool !==
        "eraser"
      ) {
        return;
      }

      const target =
        event.target;

      if (
        target ===
        target.getStage()
      ) {
        return;
      }

      const id =
        target.id();

      const type =
        target.name();

      if (!id || !type) {
        return;
      }

      let updatedRectangles =
        rectangles;

      let updatedCircles =
        circles;

      let updatedLines =
        lines;

      let updatedFreehandLines =
        freehandLines;

      let updatedTexts =
        texts;

      if (
        type ===
        "rectangle"
      ) {
        updatedRectangles =
          rectangles.filter(
            (item) =>
              String(item.id) !==
              String(id)
          );

        setRectangles(
          updatedRectangles
        );
      }

      if (
        type ===
        "circle"
      ) {
        updatedCircles =
          circles.filter(
            (item) =>
              String(item.id) !==
              String(id)
          );

        setCircles(
          updatedCircles
        );
      }

      if (
        type ===
        "line"
      ) {
        updatedLines =
          lines.filter(
            (item) =>
              String(item.id) !==
              String(id)
          );

        setLines(
          updatedLines
        );
      }

      if (
        type ===
        "freehand"
      ) {
        updatedFreehandLines =
          freehandLines.filter(
            (item) =>
              String(item.id) !==
              String(id)
          );

        setFreehandLines(
          updatedFreehandLines
        );
      }

      if (
        type ===
        "text"
      ) {
        updatedTexts =
          texts.filter(
            (item) =>
              String(item.id) !==
              String(id)
          );

        setTexts(
          updatedTexts
        );
      }

      deleteShapeFromYjs(
        id
      );

      saveToHistory(
        updatedRectangles,
        updatedCircles,
        updatedLines,
        updatedFreehandLines,
        updatedTexts
      );
    };

  const handleClear =
    () => {
      if (
        !window.confirm(
          "Are you sure you want to clear the whiteboard?"
        )
      ) {
        return;
      }

      setRectangles([]);
      setCircles([]);
      setLines([]);
      setFreehandLines([]);
      setTexts([]);

      clearShapesInYjs();

      saveToHistory(
        [],
        [],
        [],
        [],
        []
      );
    };

  const handleUndo =
    () => {
      if (
        historyIndex <
        0
      ) {
        return;
      }

      const previousIndex =
        historyIndex - 1;

      if (
        previousIndex <
        0
      ) {
        setRectangles([]);
        setCircles([]);
        setLines([]);
        setFreehandLines([]);
        setTexts([]);

        setHistoryIndex(
          -1
        );

        return;
      }

      const state =
        history[
          previousIndex
        ];

      setRectangles(
        state.rectangles
      );

      setCircles(
        state.circles
      );

      setLines(
        state.lines
      );

      setFreehandLines(
        state.freehandLines
      );

      setTexts(
        state.texts
      );

      setHistoryIndex(
        previousIndex
      );
    };

  const handleRedo =
    () => {
      const nextIndex =
        historyIndex + 1;

      if (
        nextIndex >=
        history.length
      ) {
        return;
      }

      const state =
        history[
          nextIndex
        ];

      setRectangles(
        state.rectangles
      );

      setCircles(
        state.circles
      );

      setLines(
        state.lines
      );

      setFreehandLines(
        state.freehandLines
      );

      setTexts(
        state.texts
      );

      setHistoryIndex(
        nextIndex
      );
    };

  return (
    <div className="whiteboard-wrapper">
      <WhiteboardToolbar
        selectedTool={
          selectedTool
        }
        setSelectedTool={
          setSelectedTool
        }
        onUndo={
          handleUndo
        }
        onRedo={
          handleRedo
        }
        onClear={
          handleClear
        }
        onSave={
          handleSave
        }
      />

      <div
        className="whiteboard-container"
        ref={containerRef}
      >
        <Stage
          width={size.width}
          height={size.height}
          onMouseDown={
            handleMouseDown
          }
          onMouseMove={
            handleMouseMove
          }
          onMouseUp={
            handleMouseUp
          }
          onClick={
            handleCanvasClick
          }
        >
          <Layer>
            {rectangles.map(
              (rectangle) => (
                <Rect
                  key={
                    rectangle.id
                  }
                  id={String(
                    rectangle.id
                  )}
                  name="rectangle"
                  x={
                    rectangle.x
                  }
                  y={
                    rectangle.y
                  }
                  width={
                    rectangle.width
                  }
                  height={
                    rectangle.height
                  }
                  fill="#3b82f6"
                  stroke="#2563eb"
                  strokeWidth={2}
                  draggable={
                    selectedTool ===
                    "select"
                  }
                  onDragMove={(
                    event
                  ) =>
                    handleRectangleDrag(
                      event,
                      rectangle.id
                    )
                  }
                  onDragEnd={(
                    event
                  ) =>
                    handleRectangleDragEnd(
                      event,
                      rectangle.id
                    )
                  }
                  onTransformEnd={
                    handleTransformEnd
                  }
                />
              )
            )}

            {newRectangle && (
              <Rect
                x={
                  newRectangle.x
                }
                y={
                  newRectangle.y
                }
                width={
                  newRectangle.width
                }
                height={
                  newRectangle.height
                }
                fill="#93c5fd"
                stroke="#2563eb"
                strokeWidth={1}
                opacity={0.7}
              />
            )}

            {circles.map(
              (circle) => (
                <Ellipse
                  key={
                    circle.id
                  }
                  id={String(
                    circle.id
                  )}
                  name="circle"
                  x={circle.x}
                  y={circle.y}
                  radiusX={
                    circle.radiusX
                  }
                  radiusY={
                    circle.radiusY
                  }
                  fill="#a78bfa"
                  stroke="#7c3aed"
                  strokeWidth={1}
                  draggable={
                    selectedTool ===
                    "select"
                  }
                  onDragMove={(
                    event
                  ) =>
                    handleCircleDrag(
                      event,
                      circle.id
                    )
                  }
                  onDragEnd={(
                    event
                  ) =>
                    handleCircleDragEnd(
                      event,
                      circle.id
                    )
                  }
                  onTransformEnd={
                    handleTransformEnd
                  }
                />
              )
            )}

            {newCircle && (
              <Ellipse
                x={
                  newCircle.x
                }
                y={
                  newCircle.y
                }
                radiusX={
                  newCircle.radiusX
                }
                radiusY={
                  newCircle.radiusY
                }
                fill="#c4b5fd"
                stroke="#7c3aed"
                strokeWidth={1}
                opacity={0.7}
              />
            )}

            {lines.map(
              (line) => (
                <Line
                  key={line.id}
                  id={String(
                    line.id
                  )}
                  name="line"
                  x={line.x}
                  y={line.y}
                  points={
                    line.points
                  }
                  stroke="#111827"
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                  draggable={
                    selectedTool ===
                    "select"
                  }
                  onDragMove={(
                    event
                  ) =>
                    handleLineDrag(
                      event,
                      line.id
                    )
                  }
                  onDragEnd={(
                    event
                  ) =>
                    handleLineDragEnd(
                      event,
                      line.id
                    )
                  }
                  onTransformEnd={
                    handleTransformEnd
                  }
                />
              )
            )}

            {newLine && (
              <Line
                points={
                  newLine.points
                }
                stroke="#64748b"
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
                opacity={0.7}
              />
            )}

            {freehandLines.map(
              (line) => (
                <Line
                  key={line.id}
                  id={String(
                    line.id
                  )}
                  name="freehand"
                  x={line.x}
                  y={line.y}
                  points={
                    line.points
                  }
                  stroke="#111827"
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                  tension={0.5}
                  draggable={
                    selectedTool ===
                    "select"
                  }
                  onDragMove={(
                    event
                  ) =>
                    handleFreehandDrag(
                      event,
                      line.id
                    )
                  }
                  onDragEnd={(
                    event
                  ) =>
                    handleFreehandDragEnd(
                      event,
                      line.id
                    )
                  }
                  onTransformEnd={
                    handleTransformEnd
                  }
                />
              )
            )}

            {newFreehandLine && (
              <Line
                points={
                  newFreehandLine.points
                }
                stroke="#64748b"
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
                opacity={0.7}
              />
            )}

            {texts.map(
              (text) => (
                <Text
                  key={text.id}
                  id={String(
                    text.id
                  )}
                  name="text"
                  x={text.x}
                  y={text.y}
                  text={text.text}
                  fontSize={
                    text.fontSize ||
                    20
                  }
                  fontFamily="Arial"
                  fill="#111827"
                  draggable={
                    selectedTool ===
                    "select"
                  }
                  onDragMove={(
                    event
                  ) =>
                    handleTextDrag(
                      event,
                      text.id
                    )
                  }
                  onDragEnd={(
                    event
                  ) =>
                    handleTextDragEnd(
                      event,
                      text.id
                    )
                  }
                  onTransformEnd={
                    handleTransformEnd
                  }
                />
              )
            )}

            <Transformer
              ref={
                transformerRef
              }
              rotateEnabled={
                false
              }
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right"
              ]}
              boundBoxFunc={(
                oldBox,
                newBox
              ) =>
                newBox.width <
                  8 ||
                newBox.height <
                  8
                  ? oldBox
                  : newBox
              }
            />

            {Object.entries(
              remoteCursors
            ).map(
              ([
                clientId,
                cursor
              ]) => (
                <React.Fragment
                  key={
                    clientId
                  }
                >
                  <Ellipse
                    x={
                      cursor.x
                    }
                    y={
                      cursor.y
                    }
                    radiusX={5}
                    radiusY={5}
                    fill={
                      cursor.color
                    }
                  />

                  <Text
                    x={
                      cursor.x +
                      8
                    }
                    y={
                      cursor.y -
                      6
                    }
                    text={
                      cursor.name
                    }
                    fontSize={12}
                    fill={
                      cursor.color
                    }
                    fontStyle="bold"
                  />
                </React.Fragment>
              )
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

export default Whiteboard;