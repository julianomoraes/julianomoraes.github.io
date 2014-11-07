//make sure namespace was initialized
var KK = KK || {};

KK.Utils = (function () {
  this.Iterator = function(arr, isCircular) {
      var _index = 0;
      var _data = arr || [];
      var _len = arr.length;

      return {
          next: function() {
              if (!this.hasNext()) {
                  //is circular?
                  if (isCircular) {
                    _index = 0;
                  } else {
                    return;
                  }
              }
              return _data[_index++];
          },
          hasNext: function() {
              return _index < _len;
          },
          current: function() {
              return _data[_index];
          }
      }
  };

  var _removeSpacesFromString = function(str) {
    //return str.replace(/\s+/g, '') || "";
    return str.replace(/[^A-Z0-9]/ig, '') || "";
  };
  
  var _isUrl = function(str) {
    return new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?").test(str) ? true : false;
  };

  // these are the public methods. Using a closure approach to create public methods
  return {
    Iterator : this.Iterator,
    removeSpacesFromString : _removeSpacesFromString,
    isUrl : _isUrl
  }
})();//make sure namespace was initialized
var KK = KK || {};

KK.UiComponents = (function () {

  /**
   * create a HTML fragment for a new Horizontal List following the template
   *    <div class="txt-category">CATEGORY</div>
   *    <div class="h-list">
   *        <div class="h-ele"></div>
   *               ...
   *        <div class="h-ele"></div>
   *   </div>
   * TODO: Use HTML5 template tag
   *
   *   @param {object} [param] {string} param.category | {array} param.movieList | {string} param.pic
   */
  this.HorizontalList = function(param) {
     var _MAX_PRELOAD_PERC = param.maxPreload || 20;

      var _frag = document.createDocumentFragment();

      //creating a generic div to clone it later and achieve a better performance
      var _div = document.createElement("div");

      //creates a container
      var _container = _div.cloneNode(false);
      _container.id = KK.Utils.removeSpacesFromString(param.category) || "";

      //this will be the obj to return
      _frag.appendChild(_container);

      //creates category div
      var _txtCategory = _div.cloneNode(false); //faster than creating a new div
      _txtCategory.className = "txt-category";
      _txtCategory.innerText = param.category || "";

      _container.appendChild(_txtCategory);

      //gets size of the list
      var _size = 0;
      if (typeof param.moviesList !== "undefined" && param.moviesList.constructor === Array) {
          _size = param.moviesList.length;
      }

      //creates list of horizontal elements
      var _hList = _div.cloneNode(false);
      _hList.className = "h-list";
      for (var i=0; i < _size; i++) {
          var _ele = _div.cloneNode(false);
          _ele.className = "h-ele";

          //gets pic URL from model
          var _pic = param.getMoviePic(param.moviesList[i]);

          //save the id into the div element
          _ele.id = param.moviesList[i];

          //Only pre-load _MAX_PRELOAD_PERC. Using 5 as minimum for small lists
          var MIN = 10;
          if (i < MIN || i / _size * 100 < _MAX_PRELOAD_PERC) {
            _ele.style.background = "url('"+_pic+"')";
          }

          _ele.style.backgroundColor = "black";
          _ele.style.backgroundSize = "125px 180px"; //125px auto
          _ele.style.backgroundRepeat = "no-repeat";

          //Using a cache approach through title attibute to save the URL of the image
          _ele.title = "url('"+_pic+"')";

          //_ele.style.display = "none";

          _hList.appendChild(_ele);
      }
      
      _container.appendChild(_hList);

      this.getFragment = function () {
          return _frag;
      }

      this.renderNext = function (perc) {

      }
  }

  /***
  * Contructor for a Horizontal List object
  * @param
  */
  this.VerticalInfiniteList = function(param) {
      var _index = 0;

      var _data = param.data || [];
      var _len = param.data.length;

      //lists per page
      var _PAGE_SIZE = param.pageSize || 5;

      var _className = param.className;
      var _targetEle = param.targetEle;

      //memory management - this is the max number of rows (HLists) allowed.
      var _MAX_NODES = param.maxNodes || 100;

      //this is the list of rows
      var _list = _targetEle.getElementsByClassName(_className);
      
      var _ite; //this is a helper iterator

      /**
      * The follow code limits the max memory that is going to be used. It dynamically
      * deletes divs as the scrolling list grows.
      * Currently it is limiting to MAX_NODES of Horizontal List containers. When the DOM
      * tree has more than MAX_NODES it removes 1/2 of the nodes. All the removed nodes are
      * not in the view port and it will not impact the user experience.
      * The challenge with this approach is to adjust the Y offset as removing nodes impact
      * the scrolling and offset. The way it is been calculated is based on the height of the
      * Horizontal List container. For each deleted node it scrolls currentOffset - height of
      * the element.
      * FIXME: There is one part missing in this implementation, when user scrolls backwards it should
      * re-add the removed nodes.
      */
      var _checkSizeMemoryManagement = function (callback) {
        var i = 0;
        var eleList = _targetEle.getElementsByClassName(_className);

        //TODO: Remove this log, this is expensive!!
        console.log("Nro divs:"+eleList.length);
        if (eleList.length >= _MAX_NODES) {
            while (_targetEle.firstElementChild) {
                //stop condition
                i++; if (i >= _MAX_NODES/2) break;

                //we need to remove the event listener to avoid memory leaks
                if (typeof callback === "function") callback(_targetEle.firstElementChild.lastElementChild);

                //removes the node from DOM tree
                _targetEle.removeChild(_targetEle.firstElementChild);

                //adjusts the scroller based on the div that was removed.
                window.scrollTo(pageXOffset, pageYOffset - _targetEle.firstElementChild.offsetHeight);

                //TODO: Remove this log, this is expensive!!
                console.log("Cleaning up, adjusting scrolling...");
           }
        }
        // End of memory management
      }


      var _page = 0;
      /**
      * it renders invoking the callback function passed by paramenter
      */
      this.renderNextPage = function (list, callback) {
          //it has to instanciate _ite on the first time
          if (typeof _ite === "undefined") this.updateList(list);

          for (var i=0; i < _PAGE_SIZE; i++) {
              //here we add the fragment to implement the dinamically loading.
              //we need to clone it otherwise after the appendChild the fragment is gone
              _targetEle.appendChild(list[_ite.next()].cloneNode(true));
          }

          //optimizing it to check every 5 pages
          _page++;
          if (_page % 5 === 0) {
              //check memory management to keep it small
              _checkSizeMemoryManagement(callback);
          }
      }

      /**
      * It updates the list creating a new interator that is going to be used in the renderNextPage function.
      * IMPORTANT: It is not invoked by renderNextPage to optimize the performance. It only updates the list when is requested.
      */
      this.updateList = function (list) {
          _list = list || _list || {};
          //instanciate an iterator based on the list of rows
          _ite = new KK.Utils.Iterator(Object.keys(_list), true);
      };

      return {
          updateList: this.updateList,
          renderNextPage: this.renderNextPage
      }
  };

  // these are the public methods. Using a closure approach to create public methods
  return {
    VerticalInfiniteList : this.VerticalInfiniteList,
    HorizontalList : this.HorizontalList
  }
})();/* TODOS:
  - inheritance for models. e.g. use a model > mockModel, model > jsonModel
*/

//make sure namespace was initialized
var KK = KK || {};

KK.Model = function () {
    //private vars and functions
    var _movieLists = [];
    var _movieHash = {};

    /**
    * Initiates a new Model instance.
    *
    * @param {object} [dataSource] The object that defines the type of data source:
    *   - from an object (obj.dataObj)
    *   - from an remote URL (obj.remoteDataUrl)
    *   - from a local data path (obj.localDataPath)
    *
    */
    this.init = function (param) {
        //no data, returning...
        if (typeof param === 'undefined') return;

        if (typeof param.dataObj !== 'undefined') {
            _initModelFromObj(param.dataObj, param.callback);
        } else if (typeof param.remoteDataUrl !== 'undefined') {
            _initModelFromRemote(param.remoteDataUrl, param.callback);
        } else if (typeof param.localDataPath !== 'undefined') {
            _initModelFromLocalData(param.localDataPath, param.callback);
        }
    }

    /**
    * Init using mock data that contains a list of movies and a hash object with movie details.
    *
    * @param {object} [data] The data to be used in the model.
    *   It should contain {array} object.lists and {object} object.movies.
    * @param {function} [callback] The callback function.
    */
    var _initModelFromObj = function (data, callback) {
        //check if we have data
        if (typeof data.lists !== 'undefined' && data.lists.constructor === Array && data.lists.length > 0) {
            _movieLists = data.lists;
        }

        if (typeof data.movies !== 'undefined' && data.movies.constructor === Object) {
            _movieHash = data.movies;
        }

        //we are done
        if (typeof callback === "function") callback();
    }

    var _initModelFromRemote = function (url, callback) {
        //Possible implementation below
        var _xhr = new XMLHttpRequest();
        _xhr.open('get', url, true);
        _xhr.onreadystatechange = function() {
            var _status;
            var _data;

            if (_xhr.readyState === 4 && _xhr.status === 200) {
                _data = JSON.parse(xhr.responseText);
                if (typeof callback === "function") callback(_data);
            } else {
                //handle error here. Implement a retry.
            }

        };
        _xhr.send();
    }

    var _initModelFromLocalData = function (url, callback) {
       //It could be implemented using HTML5 local file support.
       //JSON could be a file and we load it from the disk
    }

    /**
    * Return the total number of movie lists
    */
    this.getCountLists = function () {
        return _movieLists.length;
    }

    /**
    * Return the total number of movies
    */
    this.getCount = function () {
        var count = 0;
        for (var key in _movieHash) {
            count++;
        }
        return count;
    }

    /**
    * Return the summary object for a specific movie
    *
    * @param {String} [id]
    */
    this.getMovieSummary = function (id) {
        return _movieHash[id] || {};
    }

    //I was tired of type "typeof, undefined". Let's save time.
    // is good function checks if it is undefined
    //TODO: Move it to a better place
    Object.prototype.ig = function () {
        if (typeof this === "undefined") return false;
        else return true;
    }

    this.getMovieTitle = function (id) {
        //if (_movieHash[id].ig() && _movieHash[id].summary.ig() && _movieHash[id].summary.title.ig() && _movieHash[id].summary.title.title_short.ig())
            return _movieHash[id].summary.title.title_short;
        //else return "";
    }

    this.toString = function () {
        //TODO: implement more here.
        console.log(_movieLists);
    }

    /**
    * Interator partern for lists
    *
    */
    this.getNextList = function () {
        //initialize once
        if (typeof this.ite === "undefined") {
            this.ite = new KK.Utils.Iterator(_movieLists);
        }

        var nxt = this.ite.next();
        var ret = {
            moviesList: [],
            category: ""
        };

        if (typeof nxt  !== "undefined" && typeof nxt.movies !== "undefined" && nxt.movies.constructor === Array) {
            ret.moviesList = nxt.movies;
        }
        if (typeof nxt !== "undefined" && typeof nxt.summary !== "undefined" && typeof nxt.summary.displayName !== "undefined") {
            ret.category = nxt.summary.displayName;
        }

        return ret;
    }

    /**
    * It returns the url for the cover or return undefined if not found
    * @param {object} [param] param.id | param.size [portrait-small | portrait-medium | landscape-small | landscape-medium]
    */
    this.getCoverPic = function (param) {
        if (typeof param.id === "undefined") return;

        //Using a hash to achieve O(1)
        var ele = _movieHash[param.id];
        if (typeof ele.summary !== "undefined" && typeof ele.summary.box_art !== "undefined"){
            switch (param.size) {
                case "portrait-small" :
                    //caching to avoid three lookups
                    var url = ele.summary.box_art["150x214"];
                    break;
                case "portrait-medium" :
                    //caching to avoid three lookups
                    var url = ele.summary.box_art["284x405"];
                    break;
                case "landscape-small" :
                    //caching to avoid three lookups
                    var url = ele.summary.box_art["350x197"];
                    break;
                case "landscape-medium" :
                    //caching to avoid three lookups
                    var url = ele.summary.box_art["665x375"];
                    break;
            }
        }
        return (typeof url !== "undefined" && KK.Utils.isUrl(url)) ? url : undefined;
    }

    this.hasNextList = function () {
        //initialize once
        if (typeof this.ite === "undefined") {
            this.ite = new KK.Utils.Iterator(_movieLists);
        }

        return this.ite.hasNext();
    }
};

//make sure namespace was initialized
var KK = KK || {};

KK.Controller = function (model, view) {
    var _model = model;
    //main view that contains the list of movies
    var _view = view;
    //movie details view
    var _dView;
    //cache scroll offset to scroll back when switching views
    var _scrollOffset;
    
    //hash for selected elements
    //var _hashSelectedElements = {};
    //list of selected elements
    var _listSelectedElements = [];
    
    //hash of horizontal lists
    var _listOfHorizontalLists = {};

    /**
    * Initiate the controller, model and views
    */
    this.init = function() {
        //init all event listeners
        _initEvents();

        //initiates the model
        _model.init({
          dataObj: mockResponse,
          remoteDataUrl: "",
          localDataPath: "",
          callback: _populateMainView
        });
    }

    var _populateMainView = function () {
        //it initiates the main view
        while(_model.hasNextList()) {
            var _list = _model.getNextList();

            // avoid duplicated lists. This behavior was adopted due the lack of requirement definition.
            // The right way would be ask Product Management about this.
            if (_list.category === "" || typeof _listOfHorizontalLists[KK.Utils.removeSpacesFromString(_list.category)] !== "undefined" ) {
                continue;
            }

            var hl = view.addHorizonalList({
                moviesList: _list.moviesList,
                category: _list.category,
                getMoviePic: _getPicFromModel
            });

            //using a hash to make sure we have unique lists and we also make sure there is a category
            // (otherwise the list will not be displayed). It is been saved to be able to better control
            // when to render it. The disadvantage is it will use more memory. TODO: To a memory analisys
            _listOfHorizontalLists[KK.Utils.removeSpacesFromString(_list.category)] = hl.getFragment();
        }

        //create the vertical infinite list using all the horizontal lists previously created
        _view.createVerticalInfiniteList(_listOfHorizontalLists);
        
        //Everytime a new Horizontal List is created we need to let the view know about that to render the infinite list.
        //Note: we do not need to invoke it for every next page in order to achieve a better performance
        //Note2: This is commented because the createVerticalInfiniteList will update the list, we do not need to invoke it.
        //_view.updateVerticalInfiniteList(_listOfHorizontalLists);

        //render the first page of the main view
        _view.render(_listOfHorizontalLists);
    }

    var _initEvents = function () {
        //make sure the DOM is ready before adding events
        window.addEventListener("DOMContentLoaded", function() {
            //adds a vertical scrolling event to window
            //it handles the infinite scrolling
            _addVerticalScrollingEventListener();

            //adding horizontal scrolling events to all horizontal lists
            _addEventListenerToAllHorizontalLists();

            //add a unselect event when users tap anywhere in the page
            _addEventListenerToUnselectAll();
        });
        
        //Quick hack to avoid seen webkit applying styles in the elements
        //it could be better implemented but it will depends on iOS webview behavior
        window.addEventListener("load", function() {
            document.getElementById("loadingScreen").style.display = 'none';
        } );
    }

    /**
    * Add / Remove / Handle Event Listeners functions here
    */

    var _addEventListenerToUnselectAll = function () {
        window.addEventListener("click", _handleUnselectAll);
    }

    var _handleUnselectAll = function (e) {
        if (e.target.className.indexOf("h-ele") >= 0) return;
        
        for (var i=0; i < _listSelectedElements.length; i++) {
            _view.unselectElement(_listSelectedElements[i]);
        }
        //reset list
        _listSelectedElements = [];
    }

    var _addVerticalScrollingEventListener = function () {
        //It implements the infinite scroll
        window.addEventListener("scroll", _handleVerticalScrolling);
    }

    var _removeVerticalScrollingEventListener = function () {
        window.removeEventListener("scroll", _handleVerticalScrolling);
    }

    /**
    * It handles vertical scrolling for the main view
    * It loads more content when the scrolling percentage is higher than PERC_TO_LOAD_MORE
    */
    var _handleVerticalScrolling = function () {
            var PERC_TO_LOAD_MORE = 80;

            var max = document.body.scrollHeight - innerHeight;
            var percent = (pageYOffset / max) * 100;
            //console.log(pageYOffset);

            if (percent > PERC_TO_LOAD_MORE) {
                _loadMore();
                console.log("Loading more...");
           }
    }

    var tapAndHoldInProgress = false;
    /**
    * Scrolling events do not bubble, so it is not possible to implement an event delegation.
    * We need to add listeners for every horizontal list
    */
    var _addEventListenerToAllHorizontalLists = function (e) {
        // This is faster than querySelectorAll (http://jsperf.com/queryselectorall-vs-getelementsbytagname-filter)
        var list = document.getElementsByClassName("h-list");
        for (var i=0; i<list.length; i++) {
            //add scroll event to h-list
            list[i].addEventListener("scroll", _handleHorizontalScroll);

            //The follow implements tap and hold. Two event listeners are required.
            //It also uses event delegation pattern
            var timer;
            
            list[i].addEventListener("mousedown", function(e) {
                if(typeof (e.target) === "undefined" || e.target.className !== "h-ele") return;
                                     
                timer = setTimeout(function() {
                   tapAndHoldInProgress = true;
                   _handleTapAndHold(e);
                }, 500);
            });
            
            //mousedown does not work for mobile Safari. We need to use touchstart, touchend
            list[i].addEventListener("touchstart", function(e) {
                console.log("touchstart");
                                     
                                     if(typeof (e.target) === "undefined" || e.target.className !== "h-ele") return;
                                     
                                     timer = setTimeout(function() {
                                                        tapAndHoldInProgress = true;
                                                        _handleTapAndHold(e);
                                                        }, 500);
                                     
                                     
                                     
            });
            
            list[i].addEventListener("touchend", function(e) {
                console.log("touchend");

                                     clearTimeout(timer);
                                     
                                     //this setTimeout is a workaround for Safari. It is triggering click event after mouseup.
                                     setTimeout(function() {
                                                tapAndHoldInProgress = false;
                                                }, 200);
              
                                     
                                     });
            

            list[i].addEventListener("mouseup", function(e) {
                clearTimeout(timer);
                
                //this setTimeout is a workaround for Safari. It is triggering click event after mouseup.
                setTimeout(function() {
                    tapAndHoldInProgress = false;
                }, 200);
                                     
            });

            //Click events bubble, so we can use event delegation here adding a single event to the h-list
            //This is a much better approach than adding individual listeners
            list[i].addEventListener("click", function(e) {
              if (!tapAndHoldInProgress) {
                _handleClickHorizontalList(e);
              }
            });

        }
    }

    /**
    * It handles tap and hold. Event delegation patern is used here.
    */
    var _handleTapAndHold = function (e) {
        var _target = e.target;
        if(typeof (_target) !== "undefined" && _target.className === "h-ele") {
            _view.selectElement(_target);
            
            //_hashSelectedElements[_target] = _target;
            //per some reason hash for elements work on Chrome but do not work on Safari.
            _listSelectedElements.push(_target);
            
            //stops event propagation
            e.stopPropagation();
        }
    }

    /**
    * It has the implementation of event delegation for clicks in a horizontal list
    */
    var _handleClickHorizontalList = function (e) {
        var _target = e.target;
        if(typeof (_target) !== "undefined" && _target.className === "h-ele") {
            //console.log(_target.id);

            //Here I am fetching the Title / Pic from model. It is not a big deal if I have the whole model in memory because it is a hash and the coplexity is O(1).
            //If I did not have the model in memory another approach would be to cache it inside the DOM element of the div.
            var _title = _model.getMovieTitle(_target.id);
            //console.log(_title);

            //gets pic URL from model
            var _pic = _getPicFromModel(_target.id);

            console.log("Offset:"+_target.offsetTop);
            //cache the scrolling position before showing the detail view.
            //it is needed because we need to scroll back since we cannot cancel the scroll event
            _scrollOffset = _target.offsetParent.scrollTop;

            //By default there is no Movie Detail View create because we don't know if the user will ever use it.
            //Once it is created this method will use the existing one and just replace the content.
            _createMovieDetailsView({
                title: _title,
                pic: _pic
            });
            
            //stops event propagation
            e.stopPropagation();
        }
    }

    /**
    * It handles the horizontal scrolling for every h-list
    */
    var _handleHorizontalScroll = function (e) {
        var PERC_TO_LOAD_MORE = 20;  // 20% of the scrolling
        var max = (parseInt(e.srcElement.scrollWidth) - e.srcElement.clientWidth);
        var x = e.srcElement.scrollLeft;
        var perc = (x / max) * 100;

        console.log("scrolling... "+Math.floor(perc)+"%");

        //The best implementation would be dinamically load pages for every 5/10 movies.
        //This is just to help with the first load and avoid loading all the images for the h-list.
        //This implementation will initially load only 20% and than will load all for the specific h-list.
        if (perc > PERC_TO_LOAD_MORE) {
            console.log("loading all images for "+e.srcElement.parentElement.id);

            //controller invokes main view to load all the images passing a callback function that removes the listener.
            //as all the images will be loaded we don't need this function anymore. It just removes the listener.
            _view.loadAllImages(e.srcElement.parentElement, _removeHorizontalScrollListener);
        }
    }

    var _removeHorizontalScrollListener = function (ele) {
        ele.removeEventListener("scroll", _handleHorizontalScroll);
    }

    /**
    * It adds listener to the close button for the movie details view.
    * I could have used ID instead the class to be faster, but I think
    * we could have multiple close buttons and it would be better to have it
    * as a class. This function assumes the movie details view is been displayed.
    */
    var _addCloseBtnListener = function() {
        var ele = document.getElementsByClassName("btn-close");

        //ig is a validation function that checks if the elements are not undefined
        if (ele.ig() && ele[0].ig()) {
            ele[0].addEventListener("click", _handleClose);
        }
    }

    /**
    * It deactives movie details view
    */
    var _handleClose = function(e) {
        //has to scroll back to the original
        //it is required because the scrolling event because it can't be cancelled.
        window.scrollTo(pageXOffset, _scrollOffset);

        //it hides moview
        _dView.hide();
        //re-add vertical scrolling event listener because it was removed for the Movie Details View
        _addVerticalScrollingEventListener();

        //stops event propagation
        e.stopPropagation();
    }

    /**
    * It renders the Movie Details View.
    */
    var _createMovieDetailsView = function (param) {
        _dView = _dView || new KK.ViewMovieDetails();
        _dView.render({
          callback: _rendered,
          title: param.title,
          pic: param.pic
        });

        //here we need to disable vertical scrolling
        _removeVerticalScrollingEventListener();
    }

    /**
    * This is a callback invoked when view is rendered
    */
    var _rendered = function () {
        //here we have the view, let's add the listeners
        _addCloseBtnListener();
    }
    
    var _getPicFromModel = function (id) {
        //gets pic URL from model
        return _model.getCoverPic({
            id: id,
            size: "portrait-small"
        });
    }

    /**
    * It implements dinamic loading while scrolling vertically
    **/
    var _loadMore = function() {
        //we need to pass a callback to free up the listeners when nextRenderPage removes nodes from DOM
        view.renderNextPage(_listOfHorizontalLists, _removeHorizontalScrollListener);

        //after rendering the next page we need to add listener to the new elements
        //TODO: a smarter implementation could be done here to diff and add only to the new ones
        _addEventListenerToAllHorizontalLists();
    }

    this.toString = function() {
        console.log("model:");
        console.log(_model);
        console.log("view:")
        console.log(_view);
    }
};
//make sure namespace was initialized
var KK = KK || {};

KK.View = function () {
    var _mainContainer = document.querySelector("#mainContainer");
    var _header = document.querySelector("#header");
    var _vil;

    this.createVerticalInfiniteList = function (listOfHorizontalLists) {
        //vertical infinite list
        _vil = new KK.UiComponents.VerticalInfiniteList({
            data: listOfHorizontalLists,
            pageSize: 5,
            className: "h-list",
            targetEle: _mainContainer,
            maxNodes: 50
        });
    }

    /**
    * Add a new Horizontal List containing a list of movies and a category
    *
    *   @param {object} [obj] obj.category | obj.moviesList
    */
    this.addHorizonalList = function (obj) {
        //nothing to add
        if (typeof obj === "undefined" || typeof obj.category === "undefined" || typeof obj.moviesList === "undefined") return;

        var _newHList = new KK.UiComponents.HorizontalList({
            category: obj.category,
            moviesList: obj.moviesList,
            getMoviePic: obj.getMoviePic //it needs access to controll, instead provide a controll obj it only provides the fn
        });
        
        return _newHList;
    }

    this.updateVerticalInfiniteList = function (listOfHorizontalLists) {
        //every time a new element is created, it needs to update the vertical infinite list
        _vil.updateList(listOfHorizontalLists);
    }

    this.loadAllImages = function(ele, postLoadedFn) {
        var _postLoadedFn = postLoadedFn;

        var list = ele.getElementsByClassName("h-ele");

        //check if the last element has a pic. If so, just return;
        if (list[list.length-1].style.background.indexOf("url(") >= 0 ){
          //invoke a post loaded callback. It should remove the event listener.
          _postLoadedFn(ele.lastElementChild);
          return;
        }

        for (var i=0; i<list.length; i++) {
            //console.log(list[i].style.background);
            if (list[i].style.background.indexOf("url(") < 0) {
              list[i].style.background = list[i].title;
              list[i].style.backgroundColor = "black";
              list[i].style.backgroundSize = "125px 180px"; //125px auto
              list[i].style.backgroundRepeat = "no-repeat";
              //console.log(list[i].style.background);
            }
        }

        //invoke a post loaded callback. It should remove the event listener.
        _postLoadedFn(ele.lastElementChild);
    }

    this.render = function (list) {
        _vil.renderNextPage(list);
    }

    this.renderNextPage = function (list, postCleanUpCallback) {
        _vil.renderNextPage(list, postCleanUpCallback);
    }
    
    this.selectElement = function (ele) {
        if (typeof ele !== "undefined") {
            ele.className = "h-ele h-ele-selected";
        }
    }
    
    this.unselectElement = function (ele) {
        if (typeof ele !== "undefined") {
            ele.className = "h-ele";
        }
    }

    this.getMainContainer = function () {
        return _mainContainer;
    }

    this.toString = function () {
        console.log("mainContainer:");
        console.log(_mainContainer);
        console.log("listOfHorizontalLists:")
        console.log(_listOfHorizontalLists);
    }
};
//make sure namespace was initialized
var KK = KK || {};

KK.ViewMovieDetails = function () {
    var _mainContainer = null; //using null instead undefined because document.getElementById returns null if element is not found
    var _BASE_CLASS = "movie-details-container";
    var _HIDE_CLASS = "page-move-to-left";
    var _SHOW_CLASS = "page-move-from-left";

    /**
    * It implements a Singleton pattern for the main container as we don't want to create more than one.
    */
    var _getMainContainerInstance = function () {
        _mainContainer = document.getElementById("movieDetailsContainer");

        //main container does not exists
        if (_mainContainer === null) {
            _mainContainer = _createFromTemplate();
        }

        return _mainContainer;
    }

    var _createFromTemplate = function () {
        var template = document.querySelector('#movieDetailsTemplate');
        if (template === null) return;

        return (document.body.appendChild(document.importNode(template.content, true)));
    }

    /** Public Functions **/

    /**
    * It displays the view on the screen
    */
    this.render = function (contentObj) {
        //it creates the container it it does not exist yet.
        //it has to be the first thing on this method
        var _container = _getMainContainerInstance();

        //data validation
        if (typeof contentObj !== "undefined" && typeof contentObj.title !== "undefined" && typeof contentObj.pic !== "undefined") {
            var _ele = document.getElementById("movieDetailsPic");

            _ele.style.background = "url('assets/play-button-overlay.png'), url('"+contentObj.pic+"')";
            _ele.style.backgroundColor = "transparent, black";
            _ele.style.backgroundSize = "124px 124px, 125px 180px";
            _ele.style.backgroundRepeat = "no-repeat, no-repeat";
            _ele.style.backgroundPosition = "center center, center center";

            document.getElementById("movieDetailsTitle").innerText = contentObj.title;
        }

        //set the animation
        _container.className = _BASE_CLASS + " " + _SHOW_CLASS;

        if (typeof contentObj.callback === "function") contentObj.callback();
    }

    /**
    * It hides the view. In case we had a lot of diferent views we could destroy it instead hide.
    */
    this.hide = function () {
        //sets the animation to close the view using a CSS class
        _getMainContainerInstance().className = _BASE_CLASS + " " + _HIDE_CLASS;
    }

};


//Classical inheritance in JS
//This is not required for this app, but it demostrates an idea to have a base View and extend it
KK.ViewMovieDetails.prototype = new KK.View();
KK.ViewMovieDetails.constructor = KK.ViewMovieDetails;
//make sure namespace was initialized
var KK = KK || {};

//init immediate function
var init = function () {
    var model = new KK.Model();
    var view = new KK.View(model);
    var controller = new KK.Controller(model, view);
    //init controller.
    controller.init();



}();


/******** TODOs *********
- implement show info when clicking on a movie (p0)
    - block scrolling when in the new view
- review model / JSON / Ajax (p0)
- implement observer for model (p1)
- view should not access model
*************************/



