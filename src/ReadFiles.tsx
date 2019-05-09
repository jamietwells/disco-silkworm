import { ChangeEvent } from 'react';

type FileResult = {
    file: File;
    content: string;
}

type Props = {
    children: string;
    onLoad: (files: FileResult[]) => void;
    multiple?: boolean;
    accept?: string;
    className?: string;
    id?: string;
};

export const ReadFiles = (props: Props) => {

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const results: FileResult[] = [];

        function loadend(file: File, reader: FileReader, length: number) {
            return function () {
                results.push({
                    file: file,
                    content: (reader.result as string)
                });
                if (length === results.length)
                    props.onLoad(results);
            };
        }

        if (!event.currentTarget.files)
            return;

        const length = event.currentTarget.files.length;

        for(let i = 0; i < length; i++)
        {
            const file = event.currentTarget.files[i];
            const reader = new FileReader();

            reader.addEventListener('loadend', loadend(file, reader, length));
            reader.readAsText(file);
        }
    }
    let inputElement: HTMLInputElement | null;
    return <>
        <input type='file' id='folder' hidden={true} className='input-file hidden' accept={props.accept} onChange={handleChange} multiple={props.multiple} ref={input => inputElement = input} />
        <button id={props.id} className={props.className} onClick={() => {
            if (inputElement)
                (inputElement).click();
        }}>{props.children}</button>
    </>;
};