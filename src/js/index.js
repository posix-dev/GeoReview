import {Db} from "./db";

const db = new Db();
let balloon;
let map;
let placemark;
let clusterer;

ymaps.ready(init);

// const uniqBy = (a, key) => {
//     let seen = {};
//     return a.filter(function (item) {
//         let k = key(item);
//         return seen.hasOwnProperty(k) ? false : (seen[k] = true);
//     })
// }
//
// const getUniqArray = (query) => {
//     let uniqArray = [];
//
//     for (const item of query) {
//         uniqArray
//             .push(query.filter(queryItem => queryItem.coords === item.coords));
//     }
//
//     uniqArray = uniqBy(uniqArray, JSON.stringify);
//
//     return uniqArray;
// }


function init() {
    balloon = createReviewWindow();
    clusterer = createCluster();
    map = new ymaps.Map("map", {
        center: [57.5262, 38.3061],
        zoom: 11,
        controls: ['zoomControl']
    }, {
        searchControlProvider: 'yandex#search',
        balloonLayout: balloon
    });

    db.getAll().onsuccess = async (e) => {
        let query = await e.target.result;
        // let uniqArray = getUniqArray(query)
        let placemarks = [];

        for (const item of query) {
            let coords = item.coords.split(',');
            let reviewsByCoords = query.filter(queryItem => queryItem.coords === item.coords);
            const geocode = await ymaps.geocode(coords);
            const address = geocode.geoObjects.get(0).properties.get('text');
            const placemark = new ymaps.Placemark(coords, {
                address: address,
                coords: coords,
                reviews: reviewsByCoords,
                comment: item.comment,
                name: item.name,
                spot: item.spot,
            }, {
                preset: 'islands#violetDotIcon',
                hideIconOnBalloonOpen: false,
            });
            placemarks.push(placemark);
        }

        clusterer.add(placemarks);
        map.geoObjects.add(clusterer);
    }

    map.events.add('click', async e => {
        let coords = e.get('coords');
        const geocode = await ymaps.geocode(coords);
        const address = geocode.geoObjects.get(0).properties.get('text');
        db.getReviews(coords).onsuccess = async e => {
            // clusterer.add(myPlacemark);
            map.balloon.open(coords, {
                properties: {
                    address: address, coords: coords, reviews: await e.target.result
                }
            }, {
                preset: 'islands#violetDotIcon',
                hideIconOnBalloonOpen: false,
            });
        }
    })
}

const createCluster = () => {
    let customItemContentLayout = ymaps.templateLayoutFactory.createClass(
        '<h2 class=carousel_header id=cluster_spot>{{ properties.spot }}</h2>' +
        '<button class=carousel_address id=cluster_address type=button>{{ properties.address }}</button>' +
        '<div class="carousel_footer" id="cluster_comment">{{ properties.comment }}</div>' +
        '<div class="visually_hidden" id="cluster_name" type="button">{{ properties.name }}</div>' +
        '<div class="visually_hidden" id="cluster_reviews" type="button">{{ properties.reviews }}</div>' +
        '<div class="visually_hidden" id="cluster_address" type="button">{{ properties.address }}</div>' +
        '<div class="visually_hidden" id="cluster_coords" type="button">{{ properties.coords }}</div>', {
            build: function () {
                customItemContentLayout.superclass.build.call(this);
                $('.carousel_address').bind('click', this.openDetailReview);
            },
            clear: function () {
                $('.carousel_address').unbind('click', this.openDetailReview);
                customItemContentLayout.superclass.clear.call(this);
            },
            openDetailReview: () => {
                let coords = $('#cluster_coords').text();
                debugger;
                let address = $('#cluster_address').text();
                let comment = $('#cluster_comment').text();
                let name = $('#cluster_name').text();
                let spot = $('#cluster_spot').text();
                let coordsForBalloon = coords.split(",");
                db.getReviews(coords).onsuccess = async e => {
                    let myPlacemark = new ymaps.Placemark(coordsForBalloon, {
                        address: address, coords: coordsForBalloon, reviews: await e.target.result
                    }, {
                        preset: 'islands#violetDotIcon',
                        hideIconOnBalloonOpen: false,
                    });

                    map.geoObjects.add(myPlacemark);
                    myPlacemark.balloon.open();
                    // map.balloon.open(coords, {
                    //     properties: {
                    //         address: address,
                    //         coords: coordsForBalloon,
                    //         reviews: await e.target.result,
                    //         comment,
                    //         name,
                    //         spot,
                    //     }
                    // });
                }
            }
        }
    );

    return new ymaps.Clusterer({
        preset: 'islands#invertedVioletClusterIcons',
        clusterDisableClickZoom: true,
        clusterOpenBalloonOnClick: true,
        hideIconOnBalloonOpen: false,
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

const createReviewWindow = () => {
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
        '<div class="visually_hidden" id="balloon_coords">{{properties.coords}}</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>', {
            build: function () {
                debugger;
                balloon.superclass.build.call(this);
                $('#popupClose').bind('click', this.popupCloseCallback);
                $('#addReview').bind('click', this.addReview);
            },
            clear: function () {
                $('#popupClose').unbind('click', this.popupCloseCallback);
                balloon.superclass.clear.call(this);
            },
            popupCloseCallback: (e) => {
                e.preventDefault();
                map.balloon.close();
            },
            addReview: () => {
                let data = $('.form').serializeArray().reduce((obj, item) => {
                    obj[item.name] = item.value;
                    return obj;
                }, {});
                let coords = $('#balloon_coords').text();
                let address = $('.popup__address').text();
                let splitCoords = coords.split(',');
                data['date'] = new Date().toLocaleDateString('ru', {
                    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric',
                    minute: 'numeric', second: 'numeric'
                });
                data['coords'] = splitCoords;
                $('.form__name').val('');
                $('.form__spot').val('');
                $('.form__comment').val('');
                db.put(data).onsuccess = async (e) => {
                    db.getReviews(coords).onsuccess = async (e) => {
                        let reviews = await e.target.result;
                        debugger;
                        map.balloon.setData({
                            properties: {
                                reviews,
                                address,
                                coords: data.coords,
                                comment: data.comment,
                                name: data.name,
                                spot: data.spot,
                            }
                        })

                        const placemark = new ymaps.Placemark(splitCoords, {
                            address,
                            reviews,
                            coords: data.coords,
                            comment: data.comment,
                            name: data.name,
                            spot: data.spot,
                        }, {
                            preset: 'islands#violetDotIcon',
                            hideIconOnBalloonOpen: false,
                        });

                        clusterer.add(placemark);
                    };
                }
            }
        }
    );

    return balloon;
}