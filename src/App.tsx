import React, { Component } from 'react';
import { Network, DataSet, Edge, Node } from 'vis';
import { parseString } from 'xml2js'
import './App.css';
import { VisOptions } from './VisOptions';
import { ReadFiles, FileResult } from './ReadFiles';
import { Table, TableData } from './Table';
import { FileInfo, ProjectFile, ToDependencyMap, FilesMapType } from './DependencyMapper';
import { ReactComponent as Logo } from './assets/github-icon-dark.svg';

type State = {
  Files: FileInfo[],
  ShowGraph: boolean,
  Hierarchical: boolean,
  SelectedNode?: { name: string; direction: 'up' | 'down' };
}

class App extends Component<{}, State> {

  readonly accept: string[];
  elem: HTMLElement | null;
  model: { nodes: Array<{ id: string, label: string }>, edges: Array<{ from: string, to: string }> } | null;

  constructor(props: {}) {
    super(props);
    this.state = { Files: [], ShowGraph: false, Hierarchical: VisOptions.layout.hierarchical };
    this.accept = ['.csproj', '.fsproj', '.proj', '.vbproj']
    this.elem = null;
    this.model = null;
    this.componentDidUpdate.bind(this);
  }

  componentDidUpdate() {
    const instance = this;
    if (this.elem && this.model) {
      const data = {
        nodes: new DataSet<Node>(this.model.nodes),
        edges: new DataSet<Edge>(this.model.edges)
      };
      const network = new Network(this.elem, data, VisOptions);

      network.on("doubleClick", function (params) {
        function swapDirection(prev?: { direction: 'up' | 'down'}): 'up' | 'down' {
          if(prev && prev.direction === 'up')
            return 'down';
          else
            return 'up';
        }
        instance.setState(prev => ({ ...prev, SelectedNode: {name: (params.nodes as string[])[0], direction: swapDirection(prev.SelectedNode)} }));
      });
    }
  }

  render() {
    (window as any).visOptions = VisOptions;
    const instance = this;

    function onLoad(files: Array<FileResult>) {
      const length = files.length;
      const results: FileInfo[] = [];
      function toXml(file: FileResult) {
        let faulted = 0;
        function onParsed(error: any, result: any) {
          function notAlreadyAdded(file: FileInfo) {
            return files
              .map(f => f.path.raw)
              .filter(n => n === file.path.raw)
              .length === 0;
          }

          if (error) {
            console.error(error);
            faulted++;
          }

          else {
            results.push({
              ...file,
              Json: JSON.stringify(result, null, 2),
              Xml: file.content,
              Parsed: result as ProjectFile
            });
          }

          if (length === faulted + results.length) {
            instance.setState(old => ({
              ...old,
              Files: old.Files.filter(notAlreadyAdded).concat(results)
            }));
          }
        }
        parseString(file.content, onParsed);
      }
      files.forEach(toXml);
    };

    const filesMap = ToDependencyMap(this.state.Files);

    function mapEdges(f: FilesMapType) {
      function mapReferences(r: FileInfo) {
        return ({ from: f.path.raw, to: r.path.raw })
      }
      return f.References.map(mapReferences);
    }

    if (this.state.SelectedNode) {
      const {direction, name} = this.state.SelectedNode;
      const node = filesMap.filter(f => f.path.raw === name)[0];
      if (!node) {
        this.setState(prev => ({ ...prev, SelectedNode: undefined }));
        return <></>;
      }
      let nodes: FilesMapType[] = [];

      const directionFunction: ((f :FilesMapType) => FileInfo[]) = 
        direction === 'up' 
          ? f => f.ReferencedBy
          : f => f.References;

      const addNodes = function (current: FilesMapType[]) {
        current.forEach(c => {
          nodes = nodes.filter(n => n.path.raw !== c.path.raw)
            .concat(c)
            .concat(filesMap.filter(f => directionFunction(c).map(r => r.path.raw).some(p => p === f.path.raw)))
        });
      };

      addNodes([node]);

      this.model = {
        nodes: nodes.map(f => ({ id: f.path.raw, label: f.path.name })),
        edges: nodes.map(mapEdges).flat(1),
      };

    }
    else {
      this.model = {
        nodes: filesMap.map(f => ({ id: f.path.raw, label: f.path.name })),
        edges: filesMap.map(mapEdges).flat(1),
      };
    }

    function graphTableToggleClicked() {
      instance.setState(old => ({ ...old, ShowGraph: !old.ShowGraph }));
    }

    function deleteClicked(file: string, instance: App) {
      return function () {
        instance.setState(old => ({ ...old, Files: old.Files.filter(f => f.path.raw !== file) }));
      }
    }

    function hierarchicalClicked() {
      if (VisOptions.layout.hierarchical) {
        VisOptions.layout.hierarchical = false;
      }
      else {
        VisOptions.layout.hierarchical = {
          sortMethod: 'directed'
        };
      }
      instance.setState(old => ({ ...old, Hierarchical: VisOptions.layout.hierarchical }));
    }

    function getTargetFramework(file: FilesMapType) {
      const propertyGroups = file.Parsed.Project.PropertyGroup;

      return propertyGroups.map(p => p.TargetFramework)
        .flat(1)
        .concat(propertyGroups.map(p => p.TargetFrameworks).flat(1))
        .filter(t => t)
        .map(t => t.split(";"))
        .filter(t => t && t.length > 0)
        .flat();
    }

    function renderControlCell(instance: App) {
      return function (f: FilesMapType) {
        return <>
          <span className='del-button button' onClick={deleteClicked(f.path.raw, instance)}>
            Delete
        </span>
          <span hidden={instance.state.SelectedNode !== undefined && instance.state.SelectedNode.direction === 'up'} className='focus-button  button' onClick={() => instance.setState(prev => ({ ...prev, SelectedNode: { name: f.path.raw, direction: 'up' } }))}>
            Focus up
        </span>
          <span hidden={instance.state.SelectedNode !== undefined && instance.state.SelectedNode.direction === 'down'} className='focus-button  button' onClick={() => instance.setState(prev => ({ ...prev, SelectedNode: { name: f.path.raw, direction: 'down' } }))}>
            Focus down
        </span>
          <span hidden={instance.state.SelectedNode === undefined || f.path.raw !== instance.state.SelectedNode.name} className='focus-button  button' onClick={() => instance.setState(prev => ({ ...prev, SelectedNode: undefined }))}>
            Unfocus
        </span>
        </>
      }
    }

    const tableData = new TableData(filesMap)
      .AddSortableColumn("Project", f => f.path.name, (a, b) => a.path.name.localeCompare(b.path.name))
      .AddSortableColumn("Path", f => f.path.dir, (a, b) => a.path.dir.localeCompare(b.path.dir))
      .AddColumn("Framework version", f => <ul>{getTargetFramework(f).map((t, i) => <li key={i}>{t}</li>)}</ul>)
      .AddColumn("References", f => <ul>{f.References.map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>)
      .AddSortableColumn("Number of references", f => f.References.length)
      .AddColumn("Referenced by", f => <ul>{f.ReferencedBy.map(r => <li key={r.path.raw}>{r.path.name}</li>)}</ul>)
      .AddSortableColumn("Number of times referenced", f => f.ReferencedBy.length)
      .AddColumn("Graph controls", renderControlCell(this));

    return <>
      <nav>
        <span className="github-icon">
          <a href="https://github.com/jamietwells/disco-silkworm">
            <Logo className="github-icon" />
          </a>
        </span>
        <a href="https://glitch.com/edit/#!/disco-silkworm"><button>Made with Glitch</button></a>
        <ReadFiles onLoad={onLoad} multiple={true} accept={this.accept}>Import project files</ReadFiles>
        <button onClick={graphTableToggleClicked}>{instance.state.ShowGraph ? 'Show table' : 'Show graph'}</button>
        {instance.state.ShowGraph ? (<button onClick={hierarchicalClicked}>{VisOptions.layout.hierarchical ? 'Web layout' : 'Hierarchical'}</button>) : <></>}
      </nav>
      <div hidden={!instance.state.ShowGraph} className='graph' ref={r => this.elem = r}></div>
      <Table hidden={instance.state.ShowGraph} {...tableData} />
    </>
  }
}

export default App;