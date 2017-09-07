/**
 * wickedpicker v0.4.1 - A simple jQuery timepicker.
 * Copyright (c) 2015-2016 Eric Gagnon - http://github.com/wickedRidge/wickedpicker
 * License: MIT
 */

(function ($, window, document) {

    "use strict";

    if (typeof String.prototype.endsWith != 'function') {
        /*
         * Checks if this string end ends with another string
         *
         * @param {string} the string to be checked
         *
         * @return {bool}
         */
        String.prototype.endsWith = function (string) {
            return string.length > 0 && this.substring(this.length - string.length, this.length) === string;
        }
    }

    /*
     * Returns if the user agent is mobile
     *
     * @return {bool}
     */
    var isMobile = function () {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    var today = new Date();

    var pluginName = "wickedpicker",
        defaults = {
            now: today.getHours() + ':' + today.getMinutes(),
            twentyFour: false,
            upArrow: 'wickedpicker__controls__control-up',
            downArrow: 'wickedpicker__controls__control-down',
            close: 'wickedpicker__close',
            hoverState: 'hover-state',
            title: 'Timepicker',
            showSeconds: false,
            timeSeparator: ':',
            secondsInterval: 1,
            minutesInterval: 1,
            beforeShow: null,
            afterShow: null,
            show: null,
            clearable: false,
            closeOnClickOutside: true,
            onClickOutside: function() {},
        };

    // The Wickedpicker associated with the global picker widget.
    var pickerAssociation = null;

    /*
     * @param {object} The input object the timepicker is attached to.
     * @param {object} The object containing options
     */
    function Wickedpicker(element, options) {
        this.element = $(element);
        this.options = $.extend({}, defaults, options);

        this.element.addClass('hasWickedpicker');
        this.element.attr('onkeypress', 'return false;');
        this.element.attr('aria-showingpicker', 'false');
        this.createPicker();
        this.timepicker = $('.wickedpicker');
        this.up = $('.' + this.options.upArrow.split(/\s+/).join('.'));
        this.down = $('.' + this.options.downArrow.split(/\s+/).join('.'));
        this.separator = $('.wickedpicker__controls__control--separator');
        this.hoursElem = $('.wickedpicker__controls__control--hours');
        this.minutesElem = $('.wickedpicker__controls__control--minutes');
        this.secondsElem = $('.wickedpicker__controls__control--seconds');
        this.meridiemElem = $('.wickedpicker__controls__control--meridiem');
        this.close = $('.' + this.options.close.split(/\s+/).join('.'));

        //Create a new Date object based on the default or passing in now value
        var time = this.timeArrayFromString(this.options.now);
        this.options.now = new Date(today.getFullYear(), today.getMonth(), today.getDate(), time[0], time[1], time[2]);
        this.repr = { hour:0, minute:0, second:0 }; // Always keep representation in 24 hour numeric format.
        this.setHours(this.options.now.getHours());
        this.setMinutes(this.options.now.getMinutes());
        this.setSeconds(this.options.now.getSeconds());
        this.setHoverState();
        this.attach(element);
        this.setText(element);
    }

    $.extend(Wickedpicker.prototype, {

        /*
         * Show given input's timepicker
         *
         * @param {object} The input being clicked
         */
        showPicker: function (element) {
            //If there is a beforeShow function, then call it with the input calling the timepicker and the
            // timepicker itself
            if (typeof this.options.beforeShow === 'function') {
                this.options.beforeShow(element, this.timepicker);
            }
            var timepickerPos = $(element).offset();

            pickerAssociation = this;
            $(element).attr({'aria-showingpicker': 'true', 'tabindex': -1});
            this.setText(element);
            this.showHideMeridiemControl();
            this.setTime();
            this.timepicker.find(".wickedpicker__title").text(this.options.title);
            this.timepicker.css({
                'z-index': this.element.css('z-index') + 1,
                position: 'absolute',
                left: timepickerPos.left,
                top: timepickerPos.top + $(element)[0].offsetHeight
            }).show();
            //If there is a show function, then call it with the input calling the timepicker and the
            // timepicker itself
            if (typeof this.options.show === 'function') {
                this.options.show(element, this.timepicker);
            }

            this.handleTimeAdjustments(element);
        },

        /*
         * Hides the timepicker that is currently shown if it is not part of the timepicker
         *
         * @param {Object} The DOM object being clicked on the page
         *
         * BeinnLora: added trigger function to call on closing/hiding timepicker.
         */
        hideTimepicker: function (element) {
            this.timepicker.hide();
            if (typeof this.options.afterShow === 'function') {
                this.options.afterShow(element, this.timepicker);
            }
            var pickerHidden = {
                start: function () {
                    var setShowPickerFalse = $.Deferred();
                    $('[aria-showingpicker="true"]').attr('aria-showingpicker', 'false');
                    return setShowPickerFalse.promise();
                }
            };

            function setTabIndex(index) {
                setTimeout(function () {
                    $('[aria-showingpicker="false"]').attr('tabindex', index);
                }, 400);
            }

            pickerHidden.start().then(setTabIndex(0));
            pickerAssociation = null;
        },

        /*
         * Create a new timepicker. A single timepicker per page
         */
        createPicker: function () {
            if ($('.wickedpicker').length === 0) {
                var picker = '<div class="wickedpicker"><p class="wickedpicker__title">' + this.options.title + '<span class="wickedpicker__close"></span></p><ul class="wickedpicker__controls"><li class="wickedpicker__controls__control"><span class="' + this.options.upArrow + '"></span><span class="wickedpicker__controls__control--hours" tabindex="-1">00</span><span class="' + this.options.downArrow + '"></span></li><li class="wickedpicker__controls__control--separator"><span class="wickedpicker__controls__control--separator-inner">:</span></li><li class="wickedpicker__controls__control"><span class="' + this.options.upArrow + '"></span><span class="wickedpicker__controls__control--minutes" tabindex="-1">00</span><span class="' + this.options.downArrow + '"></span></li>';
                if (this.options.showSeconds) {
                    picker += '<li class="wickedpicker__controls__control--separator"><span class="wickedpicker__controls__control--separator-inner">:</span></li><li class="wickedpicker__controls__control"><span class="' + this.options.upArrow + '"></span><span class="wickedpicker__controls__control--seconds" tabindex="-1">00</span><span class="' + this.options.downArrow + '"></span> </li>';
                }
                picker += '<li class="wickedpicker__controls__control"><span class="' + this.options.upArrow + '"></span><span class="wickedpicker__controls__control--meridiem" tabindex="-1">AM</span><span class="' + this.options.downArrow + '"></span></li></ul></div>';
                $('body').append(picker);
                this.attachKeyboardEvents();
            }
        },

        /*
         * Hides the meridiem control if this timepicker is a 24 hour clock
         */
        showHideMeridiemControl: function () {
            if (this.options.twentyFour === false) {
                $(this.meridiemElem).parent().show();
            }
            else {
                $(this.meridiemElem).parent().hide();
            }
        },

        /*
         * Hides the seconds control if this timepicker has showSeconds set to true
         */
        showHideSecondsControl: function () {
            if (this.options.showSeconds) {
                $(this.secondsElem).parent().show();
            }
            else {
                $(this.secondsElem).parent().hide();
            }
        },

        /*
         * Bind the click events to the input
         *
         * @param {object} The input element
         */
        attach: function (element) {
            var self = this;

            if (this.options.clearable) {
                self.makePickerInputClearable(element);
            }

            $(element).attr('tabindex', 0);
            $(element).on('click focus', function (event) {
                //Prevent multiple firings
                if ($(self.timepicker).is(':hidden')) {
                  self.showPicker($(this));
                  window.lastTimePickerControl = $(this); //Put the reference on this timepicker into global scope for unsing that in afterShow function
                  $(self.hoursElem).focus();
                }
            });

            //Handle click events for closing Wickedpicker
            var clickHandler = function (event) { //TODO: Fix double firing
                //Only fire the hide event when you have to
                if ($(self.timepicker).is(':visible')) {
                    //Clicking the X
                    if ($(event.target).is(self.close)) {
                      self.hideTimepicker(window.lastTimePickerControl);
                    } else if ($(event.target).closest(self.timepicker).length || $(event.target).closest($('.hasWickedpicker')).length) {
                        //Clicking the Wickedpicker or one of it's inputs
                        event.stopPropagation();
                    } else if (self === pickerAssociation) {   //Everything else
                        if (typeof self.options.onClickOutside === 'function') {
                            self.options.onClickOutside();
                        }
                        else {
                            console.warn("Type of onClickOutside must be a function");
                        }

                        if (!self.options.closeOnClickOutside) {
                            return;
                        }
                        self.hideTimepicker(window.lastTimePickerControl);
                    }
                    window.lastTimePickerControl = null;
                }
            };
            $(document).off('click', clickHandler).on('click', clickHandler);
        },

        /**
         * Attach keyboard functionality to improve usability.
         */
        attachKeyboardEvents: function () {
            $(document).on('keydown', $.proxy(function (event) {
                switch (event.keyCode) {
                    case 9:
                        if (event.target.className !== 'hasWickedpicker') {
                            $(this.close).trigger('click');
                        }
                        break;
                    case 27:
                        $(this.close).trigger('click');
                        break;
                    case 37: //Left arrow
                        if (event.target.className !== this.hoursElem[0].className) {
                            $(event.target).parent().prevAll('li').not(this.separator.selector).first().children()[1].focus();
                        } else {
                            $(event.target).parent().siblings(':last').children()[1].focus();
                        }
                        break;
                    case 39: //Right arrow
                        if (event.target.className !== this.meridiemElem[0].className) {
                            $(event.target).parent().nextAll('li').not(this.separator.selector).first().children()[1].focus();
                        } else {
                            $(event.target).parent().siblings(':first').children()[1].focus();
                        }
                        break;
                    case 38: //Up arrow
                        $(':focus').prev().trigger('click');
                        break;
                    case 40: //Down arrow
                        $(':focus').next().trigger('click');
                        break;
                    default:
                        break;
                }
            }, this));
        },

        /*
         * Set the time on the timepicker to that stored in its internal
         * representation.
         *
         * @param {object} The date being set
         */
        setTime: function () {
            this.hoursElem.text(this.getHours());
            this.minutesElem.text(this.getMinutes());
            this.secondsElem.text(this.getSeconds());
            this.meridiemElem.text(this.getMeridiem());
        },

        /*
         * Get the time from the timepicker
         */
        getTime: function () {
            return [this.formatTime(this.getHours(), this.getMinutes(), this.getMeridiem(), this.getSeconds())];
        },

        /*
         * Set the timpicker's hour(s) value using 24-hour format.
         *
         * @param {string} hours
         */
        setHours: function (hours) {
            this.repr.hour = Math.abs(Number(hours) % 24);
            this.hoursElem.text(this.getHours());
            this.meridiemElem.text(this.getMeridiem());
        },

        /*
         * Get the hour(s) value as a string from the timepicker in the configured format.
         *
         * @return {integer}
         */
        getHours: function () {
            return this.parseHours(this.repr.hour);
        },

        /*
         * Returns the correct hour value based on the type of clock, 12 or 24 hour
         *
         * @param {integer} The hours value before parsing
         *
         * @return {string|integer}
         */
        parseHours: function (hours) {
            return (this.options.twentyFour === false) ? ((hours + 11) % 12) + 1 : (hours < 10) ? '0' + hours : hours;
        },

        /*
         * Sets the timpicker's minutes value
         *
         * @param {string} minutes
         */
        setMinutes: function (minutes) {
            this.repr.minute = Math.abs(Number(minutes) % 60);
            this.minutesElem.text(this.getMinutes());
        },

        /*
         * Get the minutes value from the timepicker as a string.
         *
         * @return {integer}
         */
        getMinutes: function () {
            return this.parseSecMin(this.repr.minute);
        },

        /*
         * Return a human-readable minutes/seconds value
         *
         * @param {string} value seconds or minutes
         *
         * @return {string|integer}
         */
        parseSecMin: function (value) {
            return ((value < 10) ? '0' : '') + value;
        },

        /*
         * Get the timepicker's meridiem value, AM or PM
         *
         * @return {string}
         */
        getMeridiem: function () {
            return this.repr.hour > 11 ? 'PM' : 'AM';
        },

        /*
         * Set the timepicker's seconds value
         *
         * @param {string} seconds
         */
        setSeconds: function (seconds) {
            this.repr.second = Math.abs(Number(seconds) % 60);
            this.secondsElem.text(this.getSeconds());
        },

        /*
         * Get the timepicker's seconds value as a string.
         *
         * return {string}
         */
        getSeconds: function () {
            return this.parseSecMin(this.repr.second);
        },

        /*
         * Get the correct meridiem based on the hours given
         *
         * @param {string|integer} hours
         *
         * @return {string}
         */
        parseMeridiem: function (hours) {
            return (hours > 11) ? 'PM' : 'AM';
        },

        /*
         * Handles time incrementing and decrementing and passes
         * the operator, '+' or '-', the input to be set after the change
         * and the current arrow clicked, to decipher if hours, ninutes, or meridiem.
         *
         * @param {object} The input element
         */
        handleTimeAdjustments: function (element) {
            var timeOut = 0;
            //Click and click and hold timepicker incrementer and decrementer
            $(this.up).add(this.down).off('mousedown click touchstart').on('mousedown click', {
                'Wickedpicker': this,
                'input': element
            }, function (event) {
                if(event.which!=1) return false;
                var operator = (this.className.indexOf('up') > -1) ? '+' : '-';
                var passedData = event.data;
                if (event.type == 'mousedown') {
                    timeOut = setInterval($.proxy(function (args) {
                        args.Wickedpicker.changeValue(operator, args.input, this);
                    }, this, {'Wickedpicker': passedData.Wickedpicker, 'input': passedData.input}), 200);
                } else {
                    passedData.Wickedpicker.changeValue(operator, passedData.input, this);
                }
            }).bind('mouseup touchend', function () {
                clearInterval(timeOut);
            });
        },

        /*
         * Change the timepicker's time base on what is clicked
         *
         * @param {string} The + or - operator
         * @param {object} The timepicker's associated input to be set post change
         * @param {object} The DOM arrow object clicked, determines if it is hours,
         * minutes, or meridiem base on the operator and its siblings
         */
        changeValue: function (operator, input, clicked) {
            var target = (operator === '+') ? clicked.nextSibling : clicked.previousSibling;
            var targetClass = $(target).attr('class');
            if (targetClass.endsWith('hours')) {
                this.setHours(eval(this.repr.hour + operator + 1));
            } else if (targetClass.endsWith('minutes')) {
                this.setMinutes(eval(this.repr.minute + operator + this.options.minutesInterval));
            } else if (targetClass.endsWith('seconds')) {
                this.setSeconds(eval(this.repr.second + operator + this.options.secondsInterval));
            } else {
                // Update the meridiem indirectly by changing the hours representation.
                this.setHours(eval(this.repr.hour + 12));
            }
            this.setText(input);
        },

        /*
         * Sets the given input's text to the current timepicker's time
         *
         * @param {object} The input element
         */
        setText: function (input) {
            $(input).val(this.formatTime(this.getHours(), this.getMinutes(), this.getMeridiem(), this.getSeconds())).change();
        },

        /*
         * Get the given input's value
         *
         * @param {object} The input element
         *
         * @return {string}
         */
        getText: function (input) {
            return $(input).val();
        },

        /*
         * Returns the correct time format as a string
         *
         * @param {string} hour
         * @param {string} minutes
         * @param {string} meridiem
         *
         * @return {string}
         */
        formatTime: function (hour, min, meridiem, seconds) {
            var formattedTime = hour + this.options.timeSeparator + min;
            if (this.options.showSeconds) {
                formattedTime += this.options.timeSeparator  + seconds;
            }
            if (this.options.twentyFour === false) {
                formattedTime += ' ' + meridiem;
            }
            return formattedTime;
        },

        /**
         *  Apply the hover class to the arrows and close icon fonts
         */
        setHoverState: function () {
            var self = this;
            if (!isMobile()) {
                $(this.up).add(this.down).add(this.close).hover(function() {
                    $(this).toggleClass(self.options.hoverState);
                });
            }
        },

        /**
         * Wrapping the given input field with the clearable container
         * , add a span that will contain the x, and bind the clear
         * input event to the span
         *
         * @param input
         */
        makePickerInputClearable: function(input) {
            $(input).wrap('<div class="clearable-picker"></div>').after('<span data-clear-picker>&times;</span>');

            //When the x is clicked, clear its sibling input field
            $('[data-clear-picker]').on('click', function(event) {
               $(this).siblings('.hasWickedpicker').val('');
            });
        },

        /**
         * Convert the options time string format
         * to an array
         *
         * returns => [hours, minutes, seconds]
         *
         * @param stringTime
         * @returns {*}
         */
        timeArrayFromString: function (stringTime) {
            if (stringTime.length) {
                var time = stringTime.split(':');
                time[2] = (time.length < 3) ? '00' : time[2];
                return time;
            }
            return false;
        },

        //public functions
        /*
         * Returns the requested input element's value as a formatted time string
         */
        _getTimeString: function (params) {
            var inputValue = $(this.element).val();
            return (inputValue === '') ? this.formatTime(this.getHours(), this.getMinutes(), this.getMeridiem(), this.getSeconds()) : inputValue;
        },
        _getTimeComponents: function (params) {
            var data = {
                hour: this.repr.hour,
                minute: this.repr.minute,
                second: this.repr.second
            };

            return data;
        },
        _setTimeFromString: function (params) {
            if (!params.stringTime) {
                throw "wickedpicker('setTimeFromString') requires params.stringTime";
            }
            this.options.now = params.stringTime;

            var time = this.timeArrayFromString(this.options.now);
            this.options.now = new Date(today.getFullYear(), today.getMonth(), today.getDate(), time[0], time[1], time[2]);
            this.repr.hour = this.options.now.getHours();
            this.repr.minute = this.options.now.getMinutes();
            this.repr.second = this.options.now.getSeconds();

            this.setText(this.element);

            var inputValue = $(this.element).val();
            return (inputValue === '') ? this.formatTime(this.getHours(), this.getMinutes(), this.getMeridiem(), this.getSeconds()) : inputValue;
        },
        _setTimeFromComponents: function (obj) {
            if (!obj.hour) {
                throw "wickedpicker('setTimeFromComponents') requires params.hour";
            }
            if (!obj.minute) {
                obj.minute = 0;
            }
            if (!obj.second) {
                obj.second = 0;
            }
            this.options.now = new Date(today.getFullYear(),today.getMonth(),today.getDate(),obj.hour,obj.minute,obj.second);
            this.repr.hour = obj.hour;
            this.repr.minute = obj.minute;
            this.repr.second = obj.second;
            this.setText(this.element);

            var inputValue = $(this.element).val();
            return (inputValue === '') ? this.formatTime(this.selectedHour, this.selectedMin, this.selectedMeridiem, this.selectedSec) : inputValue;

        },
        _setOptions: function(params) {
            var keys = Object.keys(params);

            for (var i = 0;i < keys.length;++i) {
                if (this.options[keys[i]]) {
                    this.options[keys[i]] = params[keys[i]];
                }
            }
        },
        _hide: function() {
            this.hideTimepicker(this.element);
        }
    });

    // Define plugin function: 'op' is the name of the operation and 'params' is
    // an optional dictionary of parameters which may include 'index' for
    // accessing an element within a result set.
    $.fn[pluginName] = function (op, params) {
        if (!$.isFunction(Wickedpicker.prototype['_' + op])) {
            return this.each(function () {
                if (!$.data(this, "plugin_" + pluginName)) {
                    $.data(this, "plugin_" + pluginName, new Wickedpicker(this, op));
                }
            });
        }
        else if ($(this).hasClass('hasWickedpicker')) {
            if (params && params.index) {
                return $.data($(this)[params.index], 'plugin_' + pluginName)['_' + op](params);
            }
            else {
                return $.data($(this)[0], 'plugin_' + pluginName)['_' + op](params);
            }
        }

        throw "Bad call to wickedpicker plugin function";
    };

})(jQuery, window, document);
