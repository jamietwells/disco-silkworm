import { Options } from "vis";

export const VisOptions = {
    autoResize: true,
    edges: {
        arrows: {
            to: true,
            from: false,
            middle: false
        }
    },
    nodes: {
        color: {
            background: "#101010",
            border: "#E0E0E0",
            highlight: "#303030"
        },
        font: {
            color: "#E0E0E0"
        }
    },
    layout: { 
        improvedLayout: false,
        hierarchical: true
    }
} as Options;