import React, { ChangeEvent } from 'react';
import { ParsedPath } from 'path';
import parse from 'path-parse';

export interface FilePath extends ParsedPath {
    raw: string;
    isParentPathOf: ((path: string[]) => boolean);
    isSubPathFor: ((path: string[]) => boolean);
}

export interface FileResult {
    name: string;
    content: string;
    path: FilePath;
}

type Props = {
    children: string;
    onLoad: (files: FileResult[]) => void;
    accept: string[];
    className?: string;
    id?: string;
    onBeginLoad?: () => void;
    onPartialLoad?: (current: number, total: number) => void;
};

function parsePath(path: string): FilePath {
    const parsed = parse(path);

    function isChildSubPathParent(parent: string[], child: string[]) {
        if (parent.length < child.length)
            return false;
        for (let i = 1; i <= child.length; i++) {
            if (child[child.length - i] !== parent[parent.length - i])
                return false;
        }
        return true;
    }

    function isSubPathFor(child: string[]) {
        return isChildSubPathParent(path.split('/'), child);
    }

    function isSubPathOf(parent: string[]) {
        return isChildSubPathParent(parent, path.split('/'));
    }

    return { ...parsed, raw: path, isParentPathOf: isSubPathOf, isSubPathFor }
}

export const ReadFiles = (props: Props) => {

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const results: FileResult[] = [];

        function loadend(file: { file: File, path: FilePath }, reader: FileReader, length: number) {
            return function () {
                results.push({
                    ...file.file,
                    name: file.file.name,
                    path: file.path,
                    content: (reader.result as string)
                });
                
                if(props.onPartialLoad)
                    props.onPartialLoad(results.length, length);

                if (length === results.length)
                    props.onLoad(results);
            };
        }

        if (!event.currentTarget.files)
            return;
        if(props.onBeginLoad)
            props.onBeginLoad();

        const files = function () {
            const results: File[] = [];
            const length = event.currentTarget.files.length;
            for (let i = 0; i < length; i++) {
                const file = event.currentTarget.files[i];
                results.push(file);
            }
            return results;
        }()
            .map(f => ({
                path: parsePath((f as any).webkitRelativePath as string),
                file: f
            }))
            .filter(f => props.accept.length === 0 || props.accept.filter(a => a === f.path.ext).length === 1);

        files.forEach(file => {
            const reader = new FileReader();
            reader.addEventListener('loadend', loadend(file, reader, files.length));
            reader.readAsText(file.file);
        });
    }

    let inputElement: HTMLInputElement | null;

    const inputAttributes = {
        webkitdirectory: "",
        directory: "",
        onChange: handleChange,
        type: 'file',
        id: 'folder',
        hidden: true,
        className: 'input-file hidden'
    };

    return <>
        <input {...inputAttributes} ref={input => inputElement = input} />
        <button id={props.id} className={props.className} onClick={() => {
            if (inputElement)
                (inputElement).click();
        }}>{props.children}</button>
    </>;
};