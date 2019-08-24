import { Options } from "vis-network";

export const VisOptions: Options = {
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
  edges:{
    arrows: {
      to:     {enabled: true, scaleFactor:1, type:'arrow'},
      middle: {enabled: false, scaleFactor:1, type:'arrow'},
      from:   {enabled: false, scaleFactor:1, type:'arrow'}
    },
    color: {
      color:'#A0A0A0',
      highlight:'#EEEEEE',
      hover: '#FFFFFF',
      inherit: 'from',
      opacity:1.0
    },
  },
  nodes:{
    borderWidth: 1,
    borderWidthSelected: 2,
    color: {
      border: '#A0A0A0',
      background: '#000000',
      highlight: {
        border: '#EEEEEE',
        background: '#000000'
      },
      hover: {
        border: '#EEEEEE',
        background: '#000000'
      }
    },
    font: {
      color: '#FFFFFF',
      size: 14,
      face: 'arial'
    }
  }
}