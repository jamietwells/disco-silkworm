import React, { Component, ChangeEvent } from 'react';
import * as xml from 'xml2js'
import './App.css';

const ReadFiles = (props: { children: string, onLoad: (file: File, content: string) => void, multiple?: boolean, accept?: string, className?: string, id?: string }) => {
  type ICollection<T> = {
    length: number;
    [index: number]: T;
  }

  function ToArray<TItem>(collection: ICollection<TItem>) {
    return ToArrayAny(collection, c => c.length, (c, i) => c[i]);
  }

  type LengthSelector<T> = (collection: T) => number;
  type ItemSelector<T, TResult> = (collection: T, index: number) => TResult;

  function ToArrayAny<T, TResult>(collection: T, lengthSelector: LengthSelector<T>, itemSelector: ItemSelector<T, TResult>): TResult[] {
    const result: TResult[] = [];
    for (let i = 0; i < lengthSelector(collection); i++)
      result.push(itemSelector(collection, i));
    return result;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files)
      ToArray(event.currentTarget.files)
        .map(f => ({
          File: f,
          Reader: new FileReader()
        }))
        .forEach(i => {
          i.Reader.addEventListener("loadend", () => props.onLoad(i.File, (i.Reader.result as string)));
          i.Reader.readAsText(i.File);
        });
  }

  let inputElement: HTMLInputElement | null;
  return <>
    <input type='file' id='folder' hidden={true} className='input-file hidden' accept={props.accept} onChange={handleChange} multiple={props.multiple} ref={input => inputElement = input} />
    <button id={props.id} className={props.className} onClick={() => {
      if (inputElement)
        (inputElement).click();
    }}>{props.children}</button>
  </>;
}

class App extends Component<{}, {Files: Array<{ Name: string, Json: string, Xml: string }> }> {
  constructor(props: {}){
    super(props);
    this.state = {Files: [] };
  }

  render() {
    const instance = this;

    function onLoad(file: File, content: string) {
      xml.parseString(content, (e, r) => {
        if (e)
          console.error(e);
        if (r)
          instance.setState(old => { old.Files.push({Name: file.name, Json: JSON.stringify(r, null, 2), Xml:content }); return old; });
      });
    };

    return <>
      <ReadFiles onLoad={onLoad} multiple={true} accept='.csproj,.fsproj'>Import Project Files</ReadFiles>
      <ul>{this.state.Files.map(f => <li>{f.Name}<pre>{f.Xml}</pre><pre>{f.Json}</pre></li>)}</ul>
      </>
  }
}

export default App;
