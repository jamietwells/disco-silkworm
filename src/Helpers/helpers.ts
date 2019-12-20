export function ToArray<T>(items: T | T[]) {
    if (Array.isArray(items))
        return items as T[];
    return [items];
}

export function ToDictionary<TInput, TKey, TValue>(items: TInput[], keyProjection: (item: TInput) => TKey, valueProjection: (item: TInput) => TValue) {
    var result = new Map<TKey, TValue>();
    for (const item of items) {
        result.set(keyProjection(item), valueProjection(item));
    }
    return result;
}