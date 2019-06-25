import { Options } from "vis";

export const VisOptions = {
    autoResize: true,
    height: '100%',
    width: '100%',
    locale: 'en',
    clickToUse: false,
    edges: {
        arrows: {
            to: { enabled: true, scaleFactor: 1, type: 'arrow' },
            middle: { enabled: false, scaleFactor: 1, type: 'arrow' },
            from: { enabled: false, scaleFactor: 1, type: 'arrow' }
        },
        selectionWidth: 1,
        smooth: {
            enabled: false
        }
    },
    layout: {
        randomSeed: undefined,
        improvedLayout: true,
        hierarchical: {
            enabled: true,
            levelSeparation: 150,
            nodeSpacing: 100,
            treeSpacing: 200,
            blockShifting: true,
            edgeMinimization: true,
            parentCentralization: true,
            direction: 'UD',
            sortMethod: 'directed'
        }
    },
    nodes: {
        shape: 'box',

        color: {
            border: '#cccccc',
            background: '#000000',
            highlight: {
                border: '#cccccc',
                background: '#303030'
            },
            hover: {
                border: '#cccccc',
                background: '#202020'
            }
        },
        font: {
            color: 'white'
        }
    },
    interaction: {
        selectConnectedEdges: false
    },
    groups: {
        criticalPath: { color: { background: 'red' }, borderWidth: 3 }
    },
    physics: {
        enabled: true,
    }
} as Options;