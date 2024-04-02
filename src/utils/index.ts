export function promiseDebounce<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    getKey: (...args: any[]) => any,
) {
    const promises = new Map();
    return function (...args: T): Promise<R> {
        const key = getKey(...args);
        if (!promises.has(key)) {
            const promise = fn(...args);
            promises.set(key, promise);
            promise.finally(() => {
                promises.delete(key);
            });
        }
        return promises.get(key)!;
    };
}

export function spacing(num: number) {
    let result = '';
    while (--num >= 0) {
        result += '&nbsp;';
    }
    return result;
}
