import {Db} from "./db";

ymaps.ready(init);

const db = new Db();
let map;

function init() {
    map = new ymaps.Map("map", {
        center: [57.5262, 38.3061],
        zoom: 11,
        controls: ['zoomControl']
    }, {
        searchControlProvider: 'yandex#search'
    });
    let clusterer = createCluster();

    db.getAll().onsuccess = async (e) => {
        let query = await e.target.result;
        let placemarks = [];

        for (const item of query) {
            let coords = item.coords.split(',')
            let reviewsByCoords = query.filter(queryItem => queryItem.coords === item.coords)
            const geocode = await ymaps.geocode(coords);
            const address = geocode.geoObjects.get(0).properties.get('text');
            // const carouselData = {
            //     coords,
            //     address,
            //     comment: item.comment,
            //     name: item.name,
            //     spot: item.spot,
            //     reviews: reviewsByCoords
            // }
            const placemark = new ymaps.Placemark(coords, {
                address: address,
                coords: coords,
                reviews: reviewsByCoords,
                comment: item.comment,
                name: item.name,
                spot: item.spot,
            }, {
                preset: 'islands#violetDotIcon',
                balloonLayout: await createReviewWindow(coords)
            });
            placemarks.push(placemark/*createCarouselPlaceMark(carouselData)*/);
        }

        clusterer.add(placemarks);
        map.geoObjects.add(clusterer);
    }

    map.events.add('click', async (e) => {
        if (!map.balloon.isOpen()) {
            let coords = e.get('coords');
            const geocode = await ymaps.geocode(coords);
            const address = geocode.geoObjects.get(0).properties.get('text');
            db.getReviews(coords).onsuccess = async e => {
                let myPlacemark = new ymaps.Placemark(coords, {
                    address: address, coords: coords, reviews: await e.target.result
                }, {
                    preset: 'islands#violetDotIcon',
                    balloonLayout: await createReviewWindow(coords)
                });

                clusterer.add(myPlacemark);
            }
        } else {
            map.balloon.close();
        }
    })
}

const createCluster = () => {
    let customItemContentLayout = ymaps.templateLayoutFactory.createClass(
        '<h2 class=carousel_header>{{ properties.spot }}</h2>' +
        '<button class=carousel_address type=button>{{ properties.address }}</button>' +
        '<div class=carousel_footer>{{ properties.comment }}</div>'
    );

    return new ymaps.Clusterer({
        preset: 'islands#invertedVioletClusterIcons',
        clusterDisableClickZoom: true,
        clusterOpenBalloonOnClick: true,
        // Устанавливаем стандартный макет балуна кластера "Карусель".
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
        // Устанавливаем собственный макет.
        clusterBalloonItemContentLayout: customItemContentLayout,
        // Устанавливаем режим открытия балуна.
        // В данном примере балун никогда не будет открываться в режиме панели.
        clusterBalloonPanelMaxMapArea: 0,
        // Устанавливаем размеры макета контента балуна (в пикселях).
        clusterBalloonContentLayoutWidth: 200,
        clusterBalloonContentLayoutHeight: 130,
        // Устанавливаем максимальное количество элементов в нижней панели на одной странице
        clusterBalloonPagerSize: 5
        // Настройка внешнего вида нижней панели.
        // Режим marker рекомендуется использовать с небольшим количеством элементов.
        // clusterBalloonPagerType: 'marker',
        // Можно отключить зацикливание списка при навигации при помощи боковых стрелок.
        // clusterBalloonCycling: false,
        // Можно отключить отображение меню навигации.
        // clusterBalloonPagerVisible: false
    });
}

const createReviewWindow = async (coords) => {
    const balloon = ymaps.templateLayoutFactory.createClass(
        '<div class="popup">' +
        '<div class="popup__inner">' +
        '<div class="popup__header">' +
        '<div class="popup__address">{{ properties.address }} </div>' +
        '<button class="popup__close" id="popupClose"></button>' +
        '</div>' +
        '<div class="popup__reviews reviews">' +
        '<div class="reviews__list">' +
        '{% if !properties.reviews.length %}' +
        '<div class="reviews__empty">Отзывов пока нет...</div>' +
        '{% endif %}' +
        '{% for review in properties.reviews %}' +
        '<div class="reviews__item">' +
        '<div class="reviews__header">' +
        '<span class="reviews__author">{{review.name}}</span>' +
        '<span class="reviews__spot">{{review.spot}}</span>' +
        '<span class="reviews__date">{{review.date}}</span>' +
        '</div>' +
        '<div class="reviews__text">{{review.comment}}</div>' +
        '</div>' +
        '{% endfor %}' +
        '</div>' +
        '<div class="reviews__body">' +
        '<h2 class="reviews__title">Ваш отзыв</h2>' +
        '<form class="reviews__form form">' +
        '<input type="hidden" class="input form__coords" value="{{ properties.coords }}">' +
        '<input type="text" class="input form__name" name="name" placeholder="Ваше имя">' +
        '<input type="text" class="input form__spot" name="spot" placeholder="Укажите место">' +
        '<textarea name="comment" id="reviews__comment" cols="30" rows="6" class="textarea form__comment" placeholder="Поделитесь впечатлениями"></textarea>' +
        '<div class="form__action">' +
        '<button class="button form__button" id="addReview" type="button">Добавить</button>' +
        '</div>' +
        '</form>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>', {
            build: function () {
                balloon.superclass.build.call(this);
                $('#popupClose').bind('click', this.popupCloseCallback);
                $('#addReview').bind('click', this.addReview);
            },
            clear: function () {
                $('#popupClose').unbind('click', this.popupCloseCallback);
                balloon.superclass.clear.call(this);
            },
            popupCloseCallback: function (e) {
                e.preventDefault();
                map.balloon.close();
            },
            addReview: function (e) {
                let target = e.target;
                console.dir(target);
                let data = $('.form').serializeArray().reduce(function (obj, item) {
                    obj[item.name] = item.value;
                    return obj;
                }, {});
                data['date'] = Date.now()
                data['coords'] = coords
                $('.form__name').val('')
                $('.form__spot').val('')
                $('.form__comment').val('')
                db.put(data);
                db.getReviews(coords).onsuccess = function (e) {
                    let data = e.target.result;
                    console.dir(data)
                    // placemark.properties.set('balloonContent', {
                    //     address: data.address,
                    //     coords: data.coords,
                    //     reviews: data.reviews,
                    //     comment: data.comment,
                    //     name: data.name,
                    //     spot: data.spot,
                    // });
                }
            }
        }
    );

    return balloon;
}


// const createCarouselPlaceMark = (data) => {
//     return new ymaps.Placemark(data.coords, {
//         address: data.address,
//         comment: data.comment,
//         name: data.name,
//         spot: data.spot,
//         reviews: data.reviews
//     }, {
//         preset: 'islands#violetDotIcon',
//         balloonLayout: createReviewWindow()
//     });
// }