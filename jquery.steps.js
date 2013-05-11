/*!
 * jQuery Steps Plugin v0.8.2 - A powerful jQuery wizard plugin that supports accessibility and HTML5
 * https://github.com/rstaib/jquery-steps
 *
 * Copyright (c) 2013 Rafael J. Staib
 * Released under the MIT license
 *
 * Follow me on twitter: https://twitter.com/@RafaelStaib
 *
 * Tested with jQuery v1.9.1 but should work with earlier and newer versions as well.
 * Please report issues at: https://github.com/rstaib/jquery-steps/issues
 */


/* TODOs:
 * - Loading Animation (Spinner)
 * - Implement preloadContent for async and iframe content types.
 * - Implement slideLeft animation
 * - Implement functionality to skip a certain amount of steps 
 * - Add insert and remove step method
 */


/* Planed Features:
 * - Progress bar
 * - Advanced Accessibility support (WAI-ARIA)
 */

(function ($)
{
    /**
    * A global unique id count.
    *
    * @static
    * @private
    * @property _uniqueId
    * @type {Integer}
    **/
    var _uniqueId = 0;

    /**
    * Represents a jQuery wizard plugin.
    *
    * @class steps
    * @constructor
    * @param {Object} method
    * @param {Array} arguments
    * @chainable
    **/
    $.fn.steps = function (method)
    {
        if ($.fn.steps[method])
        {
            return $.fn.steps[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === "object" || !method)
        {
            return initialize.apply(this, arguments);
        }
        else
        {
            $.error("Method " + method + " does not exist on jQuery.steps");
        }
    };

    /**
    * An enum represents the different content types of a step and their loading mechanisms.
    *
    * @class contentMode
    * @for steps
    **/
    $.fn.steps.contentMode = {
        /**
        * HTML embedded content
        *
        * @readOnly
        * @property html
        * @type {Integer}
        * @for contentMode
        **/
        html: 0,

        /**
        * IFrame included content
        *
        * @readOnly
        * @property iframe
        * @type {Integer}
        * @for contentMode
        **/
        iframe: 1,

        /**
        * Async embedded content
        *
        * @readOnly
        * @property async
        * @type {Integer}
        * @for contentMode
        **/
        async: 2
    };

    /**
    * An enum that represents the various transition animations.
    *
    * @class transitionEffect
    * @for steps
    **/
    $.fn.steps.transitionEffect = {
        /**
        * No transition animation
        *
        * @readOnly
        * @property none
        * @type {Integer}
        * @for transitionEffect
        **/
        none: 0,

        /**
        * Fade in transition
        *
        * @readOnly
        * @property fade
        * @type {Integer}
        * @for transitionEffect
        **/
        fade: 1,

        /**
        * Slide up transition
        *
        * @readOnly
        * @property slide
        * @type {Integer}
        * @for transitionEffect
        **/
        slide: 2,

        /**
        * Slide left transition
        *
        * @readOnly
        * @property slideLeft
        * @type {Integer}
        * @for transitionEffect
        **/
        slideLeft: 3
    };

    /**
    * An object that represents the default settings.
    * There are two possibiities to override the sub-properties.
    * Either by doing it generally (global) or on initialization.
    *
    * @static
    * @class defaults
    * @for steps
    * @example
    *   // Global approach
    *   $.steps.defaults.headerTag = "h3";
    * @example
    *   // Initialization approach
    *   $("#wizard").steps({ headerTag: "h3" });
    **/
    $.fn.steps.defaults = {
        /**
        * The header tag that is used to find the step button text within the declared wizard area.
        *
        * @property headerTag
        * @type {String}
        * @for defaults
        **/
        headerTag: "h1",

        /**
        * The body tag that is used to find the step content within the declared wizard area.
        *
        * @property bodyTag
        * @type {String}
        * @for defaults
        **/
        bodyTag: "div",

        /**
        * The content container tag that will be used to wrap all step contents.
        *
        * @property contentContainerTag
        * @type {String}
        * @for defaults
        **/
        contentContainerTag: "div",

        /**
        * The action container tag that will be used to wrap the pagination navigation.
        *
        * @property actionContainerTag
        * @type {String}
        * @for defaults
        **/
        actionContainerTag: "div",

        /**
        * The steps container tag that will be used to wrap the steps navigation.
        *
        * @property stepsContainerTag
        * @type {String}
        * @for defaults
        **/
        stepsContainerTag: "div",

        /* Templates */
        titleTemplate: "<span class=\"number\">#index#.</span> #title#",
        currentTitleTemplate: "<span class=\"current-info\">#current#</span> <span class=\"number\">#index#.</span> #title#", /* For Accessability reasons */
        loadingTemplate: "<span class=\"spinner\"></span> #text#",

        /* Behaviours */
        enableAllSteps: false, /* If true, all steps are ebable from the begining (all steps are clickable) */
        enableKeyNavigation: true,
        enablePagination: true,
        enableContentCache: true,
        enableFinishButton: true,
        preloadContent: false, /* Not yet implemented */
        showFinishButtonAlways: false,
        forceMoveForward: false,
        startIndex: 0, /* zero-based index */

        /* Animation Effect Settings */
        transitionEffect: $.fn.steps.transitionEffect.none,
        transitionEffectSpeed: 200, /* In milliseconds */

        /* Event Handlers */
        onStepChanging: function (event, currentIndex, newIndex) { return true; }, /* If return false, the step changing process will stop; ideal for form validation */
        onStepChanged: function (event, currentIndex, priorIndex) { },
        onFinishing: function (event, currentIndex) { return true; }, /* If return false, the finishing process will stop; ideal for form validation */
        onFinished: function (event, currentIndex) { },

        /* Labels */
        labels: {
            current: "current step:", /* For Accessability reasons */
            finish: "Finish",
            next: "Next",
            previous: "Previous"
        }
    };

    /*
        Public methods
    */

    /**
    * Gets the current step index.
    *
    * @method getCurrentIndex
    * @return {Integer} The actual step index (zero-based)
    * @for steps
    **/
    $.fn.steps.getCurrentIndex = function ()
    {
        return $(this).data("state").currentIndex;
    };

    /**
    * Gets the current step object.
    *
    * @method getCurrentStep
    * @return {Integer} The actual step object
    **/
    $.fn.steps.getCurrentStep = function ()
    {
        return $(this).data("state").currentStep;
    };

    /**
    * Gets a specific step object by index.
    *
    * @method getStep
    * @param {Integer} index An integer that belongs to the position of a step
    * @return {Integer} A specific step object
    **/
    $.fn.steps.getStep = function (index)
    {
        var $this = $(this);
        var state = $this.data("state");

        return (index === state.currentStep) ? state.currentStep : getStepProperties($this, index);
    };

    /**
    * Routes to the next step.
    *
    * @method next
    * @return {Boolean} Indicates whether the action executed
    **/
    $.fn.steps.next = function ()
    {
        var $this = $(this);
        return actionClick($this, $this.data("state").currentIndex + 1);
    };

    /**
    * Routes to the previous step.
    *
    * @method previous
    * @return {Boolean} Indicates whether the action executed
    **/
    $.fn.steps.previous = function ()
    {
        var $this = $(this);
        return actionClick($this, $this.data("state").currentIndex - 1);
    };

    /**
    * Skips an certain amount of steps.
    *
    * @method skip
    * @param {Integer} count The amount of steps that should be skipped
    * @return {Boolean} Indicates whether the action executed
    **/
    $.fn.steps.skip = function (count)
    {
        throw new Error("Not yet implemented!");
    };

    /**
    * Completes editing.
    *
    * @method finish
    **/
    $.fn.steps.finish = function ()
    {
        var $this = $(this);
        var options = $this.data("options");
        var state = $this.data("state");

        var currentStep = $(".steps li:eq(" + state.currentIndex + ")", $this);
        if ($this.triggerHandler("finishing", [state.currentIndex]))
        {
            currentStep.addClass("done").removeClass("error");

            $this.triggerHandler("finished", [state.currentIndex]);
        }
        else
        {
            currentStep.eq(state.currentIndex).addClass("error");
        }
    };

    /**
    * Removes a specific step by an given index.
    *
    * @method remove
    * @param {Integer} index The position (zero-based) of the step to remove
    **/
    $.fn.steps.remove = function (index)
    {
        // State must be modified
        throw new Error("Not yet implemented!");
    };

    /**
    * Adds a new step.
    *
    * @method add
    * @param {Object} step The step object to add
    **/
    $.fn.steps.add = function (step)
    {
        var wizard = $(this);
        wizard.steps("insert", wizard.data("state").stepCount, step);
    };

    /**
    * Inserts a new step to a specific position.
    *
    * @method insert
    * @param {Integer} index The position (zero-based) to add
    * @param {Object} step The step object to add
    **/
    $.fn.steps.insert = function (index, step)
    {
        // State must be modified
        throw new Error("Not yet implemented!");
    };

    /*
        Private methods
    */

    /**
    * Initializes the component.
    *
    * @private
    * @method initialize
    * @param {Object} options The component settings
    **/
    function initialize(options)
    {
        var opts = $.extend({}, $.fn.steps.defaults, options);

        return this.each(function (i)
        {
            var $this = $(this);
            $this.data("options", opts);
            $this.data("state", {
                currentIndex: opts.startIndex,
                currentStep: null,
                stepCount: 0,
                transitionShowElement: null
            });
            createUniqueId($this);

            transform($this);

            $this.bind("finishing.steps", opts.onFinishing);
            $this.bind("finished.steps", opts.onFinished);
            $this.bind("stepChanging.steps", opts.onStepChanging);
            $this.bind("stepChanged.steps", opts.onStepChanged);

            if (opts.enableKeyNavigation)
            {
                $this.keyup(function (event)
                {
                    var wizard = $(this);
                    var keyCodes = { left: 37, right: 39 };

                    if (event.keyCode === keyCodes.left)
                    {
                        event.preventDefault();
                        wizard.steps("previous");
                    }
                    else if (event.keyCode === keyCodes.right)
                    {
                        event.preventDefault();
                        wizard.steps("next");
                    }
                });
            }

            $(".steps a", $this).bind("click.steps", function (event)
            {
                event.preventDefault();

                var anchor = $(this);
                var wizard = anchor.parents(".wizard");
                var state = wizard.data("state");
                var oldIndex = state.currentIndex;

                if (anchor.parent().is(":not(.disabled):not(.current)"))
                {
                    goToStep(wizard, Number(anchor.attr("href").substring(anchor.attr("href").lastIndexOf("-") + 1)));
                }

                // If nothing has changed
                if (oldIndex === state.currentIndex)
                {
                    $(".steps a[href$=-" + oldIndex + "]", wizard).focus();
                    return false;
                }
            });

            $(".actions a", $this).bind("click.steps", function (event)
            {
                event.preventDefault();

                var anchor = $(this);
                var wizard = anchor.parents(".wizard");
                switch (anchor.attr("href"))
                {
                    case "#finish":
                        wizard.steps("finish");
                        break;

                    case "#next":
                        wizard.steps("next");
                        break;

                    case "#previous":
                        wizard.steps("previous");
                        break;
                }
            });
        });
    }

    /**
    * Fires the action next or previous click event.
    *
    * @private
    * @method actionClick
    * @param {Object} wizard The jQuery wizard object
    * @param {Integer} index The position (zero-based) to route to
    * @return {Boolean} Indicates whether the event fired successfully or not
    **/
    function actionClick(wizard, index)
    {
        var options = wizard.data("options");
        var state = wizard.data("state");
        var oldIndex = state.currentIndex;

        if (index >= 0 && index < state.stepCount && !(options.forceMoveForward && index < state.currentIndex))
        {
            var anchor = $(".steps a[href$='-" + index + "']", wizard);
            var isDisabled = anchor.parent().hasClass("disabled");
            // Remove the class to make the anchor clickable!
            anchor.parent().removeClass("disabled");
            anchor.click();

            // An error occured
            if (oldIndex === state.currentIndex && isDisabled)
            {
                // Add the class again to disable the anchor; avoid click action.
                anchor.parent().addClass("disabled");
                return false;
            }

            return true;
        }

        return false;
    }

    /**
    * Routes to a specific step by a given index.
    *
    * @private
    * @method goToStep
    * @param {Object} wizard The jQuery wizard object
    * @param {Integer} index The position (zero-based) to route to
    * @return {Boolean} Indicates whether the action succeeded or failed
    **/
    function goToStep(wizard, index)
    {
        var options = wizard.data("options");
        var state = wizard.data("state");

        if (index < 0 || index >= state.stepCount || state.stepCount === 0)
        {
            throw new Error("Index out of range.");
        }

        if (options.forceMoveForward && index < state.currentIndex)
        {
            return;
        }

        var oldIndex = state.currentIndex;
        if (wizard.triggerHandler("stepChanging", [state.currentIndex, index]))
        {
            // Save new state
            state.currentIndex = index;
            state.currentStep = getStepProperties(wizard, index);

            // Change visualisation
            var steps = $(".steps li", wizard);
            steps.eq(oldIndex).addClass("done").removeClass("current error");
            steps.eq(index).addClass("current").removeClass("disabled done").children("a").focus();

            refreshActionState(wizard);
            loadAsyncContent(wizard);

            var stepContents = $(".content > .body", wizard);
            switch (options.transitionEffect)
            {
                case $.fn.steps.transitionEffect.fade:
                    state.transitionShowElement = stepContents.eq(index);
                    stepContents.eq(oldIndex).fadeOut(options.transitionEffectSpeed, function ()
                    {
                        var wizard = $(this).parents(".wizard");
                        var state = wizard.data("state");

                        if (state.transitionShowElement)
                        {
                            state.transitionShowElement.fadeIn(options.transitionEffectSpeed);
                            state.transitionShowElement = null;
                        }
                    }).promise();
                    break;

                case $.fn.steps.transitionEffect.slide:
                    state.transitionShowElement = stepContents.eq(index);
                    stepContents.eq(oldIndex).slideUp(options.transitionEffectSpeed, function ()
                    {
                        var wizard = $(this).parents(".wizard");
                        var state = wizard.data("state");

                        if (state.transitionShowElement)
                        {
                            state.transitionShowElement.slideDown(options.transitionEffectSpeed);
                            state.transitionShowElement = null;
                        }
                    }).promise();
                    break;

                    //case $.fn.steps.transitionEffect.slideLeft:
                    //    break;

                default:
                    stepContents.eq(oldIndex).hide();
                    stepContents.eq(index).show();
                    break;
            }

            wizard.triggerHandler("stepChanged", [index, oldIndex]);
        }
        else
        {
            $(".steps li:eq(" + oldIndex + ")", wizard).addClass("error");
        }

        return true;
    }

    /**
    * Transforms the initial html structure/code.
    *
    * @private
    * @method transform
    * @param {Object} wizard The jQuery wizard object
    **/
    function transform(wizard)
    {
        var options = wizard.data("options");
        var state = wizard.data("state");

        wizard.addClass("wizard");

        var contentWrapper = $(document.createElement(options.contentContainerTag)).addClass("content");
        contentWrapper.html(wizard.html());
        wizard.empty();
        wizard.append(contentWrapper);

        var stepTitles = contentWrapper.children(options.headerTag);
        stepTitles.addClass("title");

        var stepContents = contentWrapper.children(options.bodyTag);
        stepContents.addClass("body");

        // hides all contents except the defined start content
        stepContents.not(":eq(" + options.startIndex + ")").hide();
        stepContents.eq(options.startIndex).show();

        if (stepTitles.length > stepContents.length)
        {
            throw new Error("One or more corresponding step contents are missing.");
        }
        else if (stepTitles.length < stepContents.length)
        {
            throw new Error("One or more corresponding step titles are missing.");
        }

        var stepsWrapper = $(document.createElement(options.stepsContainerTag)).addClass("steps");
        wizard.prepend(stepsWrapper);

        var stepCollection = $(document.createElement("ol"));
        stepsWrapper.append(stepCollection);

        stepTitles.each(function (index)
        {
            var $header = $(this).attr("id", getUniqueId(wizard) + "-" + index).attr("tabindex", "-1");

            var title = null;
            var stepItem = $("<li></li>");
            if (index === 0)
            {
                stepItem.addClass("first");
            }

            if (index === options.startIndex)
            {
                stepItem.addClass("current");
                title = renderTemplate(options.currentTitleTemplate, {
                    index: index + 1,
                    title: $header.html(),
                    current: options.labels.current
                });
            }
            else
            {
                title = renderTemplate(options.titleTemplate, {
                    index: index + 1,
                    title: $header.html()
                });
            }

            if (index < options.startIndex)
            {
                stepItem.addClass("done");
            }

            if (index > options.startIndex && !options.enableAllSteps)
            {
                stepItem.addClass("disabled");
            }

            stepItem.html("<a href=\"#" + $header.attr("id") + "\">" + title + "</a>");
            stepCollection.append(stepItem);
        });

        // Set state values
        state.stepCount = stepContents.length;
        state.currentStep = getStepProperties(wizard, state.currentIndex);

        if (options.enablePagination)
        {
            var actionWrapper = $(document.createElement(options.actionContainerTag)).addClass("actions");
            wizard.append(actionWrapper);

            var actionCollection = $(document.createElement("ul"));
            actionWrapper.append(actionCollection);

            if (!options.forceMoveForward)
            {
                actionCollection.append($("<li><a href=\"#previous\">" + options.labels.previous + "</a></li>"));
            }

            actionCollection.append($("<li><a href=\"#next\">" + options.labels.next + "</a></li>"));

            if (options.enableFinishButton)
            {
                actionCollection.append($("<li><a href=\"#finish\">" + options.labels.finish + "</a></li>"));
            }

            refreshActionState(wizard);
        }
    }

    /**
    * Loads and includes async content.
    *
    * @private
    * @method loadAsyncContent
    * @param {Object} wizard A jQuery wizard object
    */
    function loadAsyncContent(wizard)
    {
        var options = wizard.data("options"),
            state = wizard.data("state");

        if (!options.enableContentCache || !state.currentStep.contentLoaded)
        {
            var currentStepContent;
            switch (state.currentStep.contentMode)
            {
                case $.fn.steps.contentMode.iframe:
                    currentStepContent = $(".content > .body", wizard).eq(state.currentIndex);
                    currentStepContent.html($("<iframe src=\"" + state.currentStep.contentUrl + "\" />"));
                    currentStepContent.data("loaded", "1");
                    break;

                case $.fn.steps.contentMode.async:
                    currentStepContent = $(".content > .body", wizard).eq(state.currentIndex);
                    currentStepContent.empty();
                    $.ajax({ url: state.currentStep.contentUrl, cache: false }).done(function (data)
                    {
                        currentStepContent.html(data);
                        currentStepContent.data("loaded", "1");
                    });
                    break;
            }
        }
    }

    /**
    * Refreshs the action navigation.
    *
    * @private
    * @method refreshActionState
    */
    function refreshActionState(wizard)
    {
        var options = wizard.data("options");
        var state = wizard.data("state");

        if (options.enablePagination)
        {
            var finish = $(".actions a[href='#finish']", wizard).parent();
            var next = $(".actions a[href='#next']", wizard).parent();

            if (!options.forceMoveForward)
            {
                var previous = $(".actions a[href='#previous']", wizard).parent();
                if (state.currentIndex > 0)
                {
                    previous.removeClass("disabled");
                }
                else
                {
                    previous.addClass("disabled");
                }
            }

            if (options.enableFinishButton && options.showFinishButtonAlways)
            {
                if (state.stepCount === 0)
                {
                    finish.addClass("disabled");
                    next.addClass("disabled");
                }
                else if (state.stepCount > 1 && state.stepCount > (state.currentIndex + 1))
                {
                    finish.removeClass("disabled");
                    next.removeClass("disabled");
                }
                else
                {
                    finish.removeClass("disabled");
                    next.addClass("disabled");
                }
            }
            else
            {
                if (state.stepCount === 0)
                {
                    finish.hide();
                    next.show().addClass("disabled");
                }
                else if (state.stepCount > 1 && state.stepCount > (state.currentIndex + 1))
                {
                    finish.hide();
                    next.show().removeClass("disabled");
                }
                else if (!options.enableFinishButton)
                {
                    next.addClass("disabled");
                }
                else
                {
                    finish.show();
                    next.hide().removeClass("disabled");
                }
            }
        }
    }

    /**
    * Renders a template and substitutes all placeholder.
    *
    * @private
    * @method renderTemplate
    * @param {String} template A template
    * @param {Object} substitutes A list of substitute
    * @return {String} The rendered template
    */
    function renderTemplate(template, substitutes)
    {
        var matches = template.match(/#([a-z]*)#/gi);
        for (var i = 0; i < matches.length; i++)
        {
            var match = matches[i], key = match.substring(1, match.length - 1);
            template = template.replace(match, getSubstitute(substitutes, key));
        }

        return template;
    }

    /**
    * Gets a substitute by key.
    *
    * @private
    * @method getSubstitute
    * @param {Object} substitutes A list of substitute
    * @param {String} key The key to look for
    * @return {String} A suitable substitute
    */
    function getSubstitute(substitutes, key)
    {
        if (substitutes[key] === undefined)
        {
            throw new Error("The key \"" + key + "\" does not exist in the substitute collection!");
        }

        return substitutes[key];
    }

    /**
    * Gets a step by an given index.
    *
    * @private
    * @method getStepProperties
    * @param {Object} wizard A jQuery wizard object  
    * @param {Integer} index The position (zero-based) of a step
    * @return {Object} Returns a step object
    */
    function getStepProperties(wizard, index)
    {
        var options = wizard.data("options");
        var $header = $(".content > .title:eq(" + index + ")", wizard);
        var $content = $header.next(".body");
        var mode = (isNaN($content.data("mode")) || Number($content.data("mode")) > 2) ?
            $.fn.steps.contentMode.html : Number($content.data("mode"));
        var contentUrl = (mode === $.fn.steps.contentMode.html || $content.data("url") === undefined) ?
            "" : $content.data("url");
        var contentLoaded = (mode !== $.fn.steps.contentMode.html && $content.data("loaded") === "1");

        return {
            title: $header.html(),
            content: (mode === $.fn.steps.contentMode.html) ? $content.html() : "",
            contentUrl: contentUrl,
            contentMode: mode,
            contentLoaded: contentLoaded
        };
    }


    /**
    * Creates an unique id and adds this to the corresponding wizard instance.
    *
    * @private
    * @method createUniqueId
    * @param {Object} wizard A jQuery wizard object
    */
    function createUniqueId(wizard)
    {
        if (wizard.data("uid") === undefined)
        {
            wizard.data("uid", "steps-uid-".concat(++_uniqueId));
        }
    }

    /**
    * Retrieves the unique id from the given wizard instance.
    *
    * @private
    * @method getUniqueId
    * @param {Object} wizard A jQuery wizard object
    * @return {String} Returns the unique for the given wizard
    */
    function getUniqueId(wizard)
    {
        return wizard.data("uid");
    }
})(jQuery);