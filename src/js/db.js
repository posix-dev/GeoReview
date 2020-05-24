// eslint-disable-next-line import/prefer-default-export
export class Db {
    constructor() {
        this.DB_NAME = 'reviewsDb';
        this.indexedDB = window.indexedDB || window.webkitIndexedDB
            || window.mozIndexedDB || window.msIndexedDB;

        const request = this.indexedDB.open('reviewsDb', 1);
        request.onerror = (e) => console.log(`${e} ERROR`);
        request.onupgradeneeded = () => this.createStore(request);
        request.onsuccess = () => this.db = request.result;

        // this.deleteDataBase()
    }

    createStore(request) {
        this.db = request.result;
        const store = this.db.createObjectStore('reviews', {keyPath: 'id', autoIncrement: true});
        store.createIndex('by_comment', 'comment');
        store.createIndex('by_coords', 'coords');
        store.createIndex('by_spot', 'spot');
        store.createIndex('by_name', 'name');
        store.createIndex('by_date', 'date');

        // Populate with initial data.
        store.put({
            name: 'Pavel Memories',
            spot: 'Africa',
            comment: 'hello1',
            coords: '55.7558,37.6173',
            date: '16 Jan',
        });
    }

    // целый экземпляр
    put({
            name, spot, comment, coords, date,
        }) {
        const transaction = this.db.transaction(['reviews'], 'readwrite');
        transaction.oncomplete = () => console.dir(`success put - ${{
            name, spot, comment, coords, date,
        }}`);
        transaction.onerror = (e) => console.log(`error in put - ${e.target}`);

        const objectStore = transaction.objectStore('reviews');
        const review = {name, spot, comment, coords: coords.join(','), date};

        debugger;

        return objectStore.put(review);
    }

    getReviews(coords) {
        const transaction = this.db.transaction(['reviews'], 'readwrite');
        const objectStore = transaction.objectStore('reviews');
        const coordsIndex = objectStore.index('by_coords');

        transaction.oncomplete = (e) => console.dir(`getReviews success ${e.target}`);
        transaction.onerror = (e) => console.log(`getReviews error ${e.target.errorCode}`);

        return coordsIndex.getAll(coords);
    }

    getAll() {
        const transaction = this.db.transaction(['reviews'], 'readwrite');
        const objectStore = transaction.objectStore('reviews');

        transaction.oncomplete = (e) => console.dir(`getAll success ${e.target}`);
        transaction.onerror = (e) => console.dir(`${e.target.errorCode}`);

        return objectStore.getAll();
    }

    deleteDataBase() {
        this.indexedDB.deleteDatabase(this.DB_NAME);
    }
}
