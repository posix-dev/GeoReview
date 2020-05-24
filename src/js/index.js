import {Db} from './db';

const db = new Db();
let map;
let clusterer;

ymaps.ready(init);

function init() {
    initMapsVariables();
    initReviewsFromDb();
    initClickListeners();
}

const initMapsVariables = () => {
    const balloon = createBalloon();
    clusterer = createCluster();
    map = new ymaps.Map('map', {
        center: [57.5262, 38.3061],
        zoom: 11,
        controls: ['zoomControl'],
    }, {
        balloonLayout: balloon,
    });
};

const createAndGetPlacemark = (coords, options = {}, presets = {}) => new ymaps.Placemark(coords, options, presets);

const initReviewsFromDb = () => db.getAll().onsuccess = async ({target}) => {
    const query = await target.result;
    const placemarks = [];

    for (const item of query) {
        const coords = item.coords.split(',');
        const reviewsByCoords = query.filter((queryItem) => queryItem.coords === item.coords);
        const geocode = await ymaps.geocode(coords);
        const address = geocode.geoObjects.get(0).properties.get('text');
        const placemark = createAndGetPlacemark(coords, {
            address,
            coords,
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
};

const initClickListeners = () => {
    map.events.add('click', async (e) => {
        const coords = e.get('coords');
        const geocode = await ymaps.geocode(coords);
        const address = geocode.geoObjects.get(0).properties.get('text');
        db.getReviews(coords.join(',')).onsuccess = async ({target}) => {
            map.balloon.open(coords, {
                properties: {
                    address, coords, reviews: await target.result,
                },
            }, {
                preset: 'islands#violetDotIcon',
                hideIconOnBalloonOpen: false,
            });
        };
    });
};

const createCluster = () => {
    // вынести в pug верстку
    const customItemContentLayout = ymaps.templateLayoutFactory.createClass(
        `<h2 class=carousel_header id=cluster_spot>{{ properties.spot }}</h2>
        <button class=carousel_address id=cluster_address type=button>{{ properties.address }}</button>
        <div class="carousel_footer" id="cluster_comment">{{ properties.comment }}</div>
        <div class="visually_hidden" id="cluster_name" type="button">{{ properties.name }}</div>
        <div class="visually_hidden" id="cluster_reviews" type="button">{{ properties.reviews }}</div>
        <div class="visually_hidden" id="cluster_address" type="button">{{ properties.address }}</div>
        <div class="visually_hidden" id="cluster_coords" type="button">{{ properties.coords }}</div>`, {
            build() {
                customItemContentLayout.superclass.build.call(this);
                $('.carousel_address').bind('click', this.openDetailReview);
            },
            clear() {
                $('.carousel_address').unbind('click', this.openDetailReview);
                customItemContentLayout.superclass.clear.call(this);
            },
            openDetailReview: () => {
                const coords = $('#cluster_coords').text();
                const address = $('#cluster_address').text();
                const coordsForBalloon = coords.split(',');
                db.getReviews(coords).onsuccess = async ({target}) => {
                    map.balloon.open(coordsForBalloon, {
                        properties: {
                            address, coords: coordsForBalloon, reviews: await target.result,
                        },
                    }, {
                        preset: 'islands#violetDotIcon',
                        hideIconOnBalloonOpen: false,
                    });
                };
            },
        },
    );

    return getCluster(customItemContentLayout);
};

const getCluster = (customItemContentLayout) => new ymaps.Clusterer({
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
    clusterBalloonPagerSize: 5,
    balloonLayout: 'cluster#balloonCarousel',
    // Настройка внешнего вида нижней панели.
    // Режим marker рекомендуется использовать с небольшим количеством элементов.
    // clusterBalloonPagerType: 'marker',
    // Можно отключить зацикливание списка при навигации при помощи боковых стрелок.
    // clusterBalloonCycling: false,
    // Можно отключить отображение меню навигации.
    // clusterBalloonPagerVisible: false
});

const getLocalizedFormatString = () =>
    new Date().toLocaleDateString('ru', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    });

const createBalloon = () => {
    // вынести в pug верстку
    const balloon = ymaps.templateLayoutFactory.createClass(
        `<div class="popup">
        <div class="popup__inner">
        <div class="popup__header">
        <div class="popup__address">{{ properties.address }} </div>
        <button class="popup__close" id="popupClose"></button>
        </div>
        <div class="popup__reviews reviews">
        <div class="reviews__list">
        {% if !properties.reviews.length %}
        <div class="reviews__empty">Отзывов пока нет...</div>
        {% endif %}
        {% for review in properties.reviews %}
        <div class="reviews__item">
        <div class="reviews__header">
        <span class="reviews__author">{{review.name}}</span>
        <span class="reviews__spot">{{review.spot}}</span>
        <span class="reviews__date">{{review.date}}</span>
        </div>
        <div class="reviews__text">{{review.comment}}</div>
        </div>
        {% endfor %}
        </div>
        <div class="reviews__body">
        <h2 class="reviews__title">Ваш отзыв</h2>
        <form class="reviews__form form">
        <input type="hidden" name="coords" value="{{ properties.coords }}"/>
        <input type="hidden" name="address" value="{{ properties.address }}"/>
        <input type="text" class="input form__name" name="name" placeholder="Ваше имя"/>
        <input type="text" class="input form__spot" name="spot" placeholder="Укажите место"/>
        <textarea name="comment" id="reviews__comment" cols="30" rows="6" class="textarea form__comment" placeholder="Поделитесь впечатлениями"></textarea>
        <div class="form__action">
        <button class="button form__button" id="addReview" type="button">Добавить</button>
        </div>
        </form>
        </div>
        </div>
        </div>
        </div>`, {
            build() {
                balloon.superclass.build.call(this);
                $('#popupClose').bind('click', this.popupCloseCallback);
                $('#addReview').bind('click', this.addReview);
            },
            clear() {
                $('#popupClose').unbind('click', this.popupCloseCallback);
                balloon.superclass.clear.call(this);
            },
            popupCloseCallback: e => {
                e.preventDefault();
                map.balloon.close();
            },
            addReview: () => {
                const data = $('.form').serializeArray().reduce((obj, item) => {
                    obj[item.name] = item.value;
                    return obj;
                }, {});
                data.date = getLocalizedFormatString();
                data.coords = data.coords.split(',');
                db.put(data).onsuccess = () => {
                    db.getReviews(data.coords.join(',')).onsuccess = async ({target}) => {
                        const reviews = await target.result;
                        const {address, coords, comment, name, spot} = data;
                        debugger;
                        map.balloon.setData({
                            properties: {
                                reviews, address, coords, comment, name, spot
                            },
                        });

                        const placemark = createAndGetPlacemark(coords, {
                            address, reviews, coords, comment, name, spot
                        }, {
                            preset: 'islands#violetDotIcon',
                            hideIconOnBalloonOpen: false,
                        });

                        clusterer.add(placemark);
                        //не пойму как вынести в функцию внутри балуна=)
                        $('.form__name').val('');
                        $('.form__spot').val('');
                        $('.form__comment').val('');
                    };
                };
            },
        },
    );

    return balloon;
};
