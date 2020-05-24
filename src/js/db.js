export class Db {

    constructor() {
        this.DB_NAME = "reviewsDb"
        this.indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.msIndexedDB;

        let request = this.indexedDB.open("reviewsDb", 1);
        request.onerror = e => console.log(`${e} ERROR`);
        request.onupgradeneeded = () => this.createStore(request);
        request.onsuccess = () => this.db = request.result;

        // this.deleteDataBase()
    }

    createStore(request) {
        this.db = request.result;
        const store = this.db.createObjectStore("reviews", {keyPath: "id", autoIncrement: true});
        const commentIndex = store.createIndex("by_comment", "comment",);
        const coordsIndex = store.createIndex("by_coords", "coords",);
        const spotIndex = store.createIndex("by_spot", "spot");
        const nameIndex = store.createIndex("by_name", "name");
        const dateIndex = store.createIndex("by_date", "date");

        // Populate with initial data.
        store.put({
            name: "Pavel Memories",
            spot: "Africa",
            comment: "hello1",
            coords: "55.7558,37.6173",
            date: "16 Jan"
        });
    }

    //целый экземпляр
    put(data) {
        let transaction = this.db.transaction(["reviews"], "readwrite");
        transaction.oncomplete = function (e) {
            console.dir(`success put - ${data}`);
        };

        transaction.onerror = function (e) {
            console.dir(`error in put - ${e.target}`);
        };

        let objectStore = transaction.objectStore("reviews");
        let review = {
            name: data.name,
            spot: data.spot,
            comment: data.comment,
            coords: data.coords.join(','),
            date: data.date
        }

        return objectStore.put(review);
    }

    getReviews(coords) {
        let transaction = this.db.transaction(["reviews"], "readwrite");
        let objectStore = transaction.objectStore("reviews");
        const coordsIndex = objectStore.index('by_coords')

        transaction.oncomplete = e => console.log(`getReviews ${e.target}`);
        transaction.onerror = e => console.dir(`getReviews ${e.target.errorCode}`);

        return coordsIndex.getAll(coords)
    }

    getAll() {
        let transaction = this.db.transaction(["reviews"], "readwrite");
        let objectStore = transaction.objectStore("reviews");

        transaction.oncomplete = (e) => console.dir(`getAll success ${e.target}`);
        transaction.onerror = e => console.dir(`${e.target.errorCode}`);

        return objectStore.getAll()
    }

    deleteDataBase() {
        this.indexedDB.deleteDatabase(this.DB_NAME)
    }
}