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
            date: 12543534534
        });
    }

    //целый экземпляр
    put(data) {
        let transaction = this.db.transaction(["reviews"], "readwrite");
        transaction.oncomplete = function (e) {
            console.log("All done!");
        };

        transaction.onerror = function (e) {
            // Don't forget to handle errors!
        };

        let objectStore = transaction.objectStore("reviews");
        let review = {
            name: data.name,
            spot: data.spot,
            comment: data.comment,
            coords: data.coords.join(','),
            date: data.date
        }

        objectStore.put(review).onsuccess = (e) => {
            console.log(`ehhu - ${e.target.result}`)
        }
    }

    getReviews(coords) {
        let transaction = this.db.transaction(["reviews"], "readwrite");
        let objectStore = transaction.objectStore("reviews");
        const coordsIndex = objectStore.index('by_coords')
        transaction.oncomplete = (e) => {
            console.log("All done!");
        };

        transaction.onerror = (e) => {
            // Don't forget to handle errors!
        };

        return coordsIndex.getAll(coords)
    }

    getAll() {
        let transaction = this.db.transaction(["reviews"], "readwrite");
        transaction.oncomplete = function (e) {
            console.log("All done!");
        };

        transaction.onerror = function (e) {
            // Don't forget to handle errors!
        };

        let objectStore = transaction.objectStore("reviews");
        return objectStore.getAll()
    }

    delete(coords) {

    }

    deleteDataBase() {
        this.indexedDB.deleteDatabase(this.DB_NAME)
    }
}