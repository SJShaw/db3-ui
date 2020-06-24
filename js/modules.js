const CLASSNAME = ".element-alternatives";

const IGNORE = "<div class=\"element element-ignore\">ignored</div>";

const SORTSTUFF = {
        connectWith: CLASSNAME,
        placeholder: "element-placeholder",
        opacity: 0.5,  // opacity for the element being dragged
        delay: 100,  // allows time before dragging for click, potentially useful for the static ones
        activate: function (event, ui) {  // create empty alternative buckets when dragging
            $(".empty-alternatives").show();
            $(CLASSNAME).sortable("refreshPositions");
        },
        start: function (event, ui) {
            $(CLASSNAME).css("margin-left", "2em");
            $(CLASSNAME).css("margin-right", "2em");
            $(CLASSNAME).css("border", "1px dashed gray");
        },
        stop: function (event, ui) {  // remove empty alternative buckets after dragging
            removeEmptyOptions();
            $(CLASSNAME).css("margin-left", "");
            $(CLASSNAME).css("margin-right", "");
            $(CLASSNAME).css("border", "");
            updateSearchText();
            // prevent a click event immediately after this, otherwise it'll be removed
            $(event.originalEvent.target).one('click', function (e) {
                if (e) {
                    e.stopImmediatePropagation();
                }
            });
            ui.item.removeAttr("style"); // jqueryUI adds some fixed widths for some reason
        },
        receive: function (event, ui) {  // if a list becomes non-empty, or a list with none has a non-none added, remove the "any" or "none"
            // TODO be more clever if the item being dropped is a "none" itself
            removeNone(event.target);
            if (ui.item.hasClass("element")) {
                return;
            }
//            $(`<div class="element"></div>`).append(ui.item).appendTo(event.target);
//            ui.item.wrap(`<div class="element"></div>`);
        },
        out: function (event, ui) {  // if a list becomes non-empty, or a list with none has a non-none added, remove the "any" or "none"
            $(".element-alternatives:not(:has(.element))").not(".empty-alternatives").remove()
        },
};


function addEmptyOptions(element) {
    $(".section-elements")
        .append("<div class=\"element-alternatives empty-alternatives\"><span class=\"create-alt\">create alternative</span></div>");
    $(CLASSNAME).sortable(SORTSTUFF);
}

function removeEmptyOptions() {
    $(".empty-alternatives").hide();
    $(".element-alternatives").filter(function () {
        return $(this).children().length === 0 && $(this).siblings.length > 0;
    }).remove();
    $(".section-elements").filter(function () {
        return $(this).children().not(".empty-alternatives").length == 0;
    }).prepend("<div class=\"element-alternatives\"><div class=\"element element-ignore\">ignored</div></div>");
    $(CLASSNAME).sortable(SORTSTUFF);
}

function removeNone(element) {
    const target = $(element);
    if (target.hasClass("empty-alternatives")) {
        target.removeClass("empty-alternatives");
        target.parent().append("<div class=\"element-alternatives empty-alternatives\"><span class=\"create-alt\">create alternative</span></div>")
            .sortable(SORTSTUFF);
        target.children().filter(".create-alt").remove();
        target.removeClass("empty-alternatives");
    }
    target.find(".element-none").remove();
    target.find(".element-ignore").remove();
}

function generateSearchText() {
    let textParts = [];
    $(".section-elements").each(function () {
        const alternatives = $(this).children();
        if (alternatives.length == 0) {
            return;
        }
        let alternates = [];
        alternatives.each(function () {
            const children = [];
            $(this).children().filter(".element").each(function () {
                const part = $(this).text().trim();
                if (part.length > 0) {
                    if (part === "none") {
                        children.push("0");
                    } else if (part !== "ignored") {
                        children.push(part);
                    }
                }
            });
            if (children.length > 0) {
                alternates.push(children.join("+"));  //TODO: differentiate between "and" and "then"
            }
        });
        if (alternates.length > 0) {
            textParts.push($(this).attr("data-type") + "=" + alternates.join(","));
        }
    });
    return textParts.join("|");
}

function updateSearchText() {
    const text = generateSearchText();
    let searchText = "?query=" + encodeURIComponent(text);
    if (!text) {
        searchText = "";
    }
    window.history.replaceState({}, '', `${window.location.pathname}${searchText}`);
}

function rebuild() {
    if (!window.location.search) {
        return;
    }
    const rawQuery = decodeURIComponent(new URL(window.location).searchParams.get("query"));
    if (!rawQuery) {
        // remove any search params if empty, e.g. "?query="
        window.history.replaceState({}, '', `${window.location.pathname}`);
        return;
    }
    const sections = rawQuery.split("|");
    for (i = 0; i < sections.length; i++) {
        const all = sections[i].split("=");
        const category = all[0];
        const alternatives = all[1].split(",");
        const container = $(`.section-elements[data-type='${category}'`);
        container.children().remove();
        for (j = 0; j < alternatives.length; j++) {
            const parts = alternatives[j].split("+");
            const newAlternative = $(`<div class="element-alternatives"></div>`).sortable(SORTSTUFF);
            for (k = 0; k < parts.length; k++) {
                let name = parts[k];
                if (name === "0") {
                    name = "none";
                } else if (name === "?") {
                    name = "any";
                }
                const element = $(`<div class="element"></div>`);
                const matching = $(".domain-section .element-inner").filter(function () {
                    return $(this).text().trim() === name;
                });
                if (matching.length === 0) {
                    showError(`bad query, unknown domain name: ${name}`);
                    reset();
                    return;
                }
                matching
                    .first()  // because otherwise it'd clone "any"/"none" from all sections
                    .clone().appendTo(element);
                element.appendTo(newAlternative)
            }
            newAlternative.appendTo(container);
            newAlternative.sortable(SORTSTUFF);
        }
    }
}

function showError(message) {
    $(".error-message > .message").text(message);
    if (!message) {
        $(".error-message").css("opacity", 0);
        return
    }
    $(".error-message").stop().css("opacity", 1).fadeOut(4000);
}


function clickedElement(event) {
    $(this).remove();
    removeEmptyOptions();
    updateSearchText();
}

function reset() {
   $(".element-alternatives").remove();
    addEmptyOptions();
    removeEmptyOptions();
    window.history.replaceState({}, '', `${window.location.pathname}`);
}

function runSearch() {
    var query = generateSearchText();

    $.ajax({
        method: 'post',
        url: "/api/v1.0/search",
        data: JSON.stringify({
            query: {
               'return_type': 'json',
               'search': 'cluster',
                'terms': {
                    'term_type': "expr",
                    'category': "modulequery",
                    'term': query
                },
            },
            offset: $(".query-container").is(":visible") ? 0 : $(".load-more").attr("data-start")
        }),
        dataType: 'json',
        contentType: 'application/json',
        processData: false,
        async: true,
        success: function (data, status, req) {
            console.log(status, data);
            //TODO show results
            if (data.clusters && data.clusters.length === 0) {
                //TODO handle no results
                alert("no results");
            } else {
                $(".query-container").hide();
                showResults(data);
                //TODO CSV
            }
        },
        error: function (data, status, req) {
            //TODO show 'an error occurred'
            alert("error getting results");
        }
    });
    // TODO show "Searching, please wait..."
}

function start() {
    $(".domain-section .element-inner").wrap(`<div class="element"></div>`)
    const container = $("#module-query-svg-container");
    const query = container.attr("data-query");
    rebuild();
    addEmptyOptions();
    $(CLASSNAME).sortable(SORTSTUFF);
    $(".empty-alternatives").hide();
    $(".domain-section .element").draggable({
        helper: 'clone',
        connectToSortable: CLASSNAME,
        start: SORTSTUFF.start,
        stop: SORTSTUFF.stop,
    });
    $(".search-button").click(runSearch);
    $(".example-button").click(function () {
        var searchText = "S%3DPKS_KS%7CL%3D0%7CM%3DoMT%2BPKS_DH%2CnMT%2BPKS_DH%2CnMT%2BPKS_DH%7CT%3Dany"
        window.history.replaceState({}, '', `${window.location.pathname}?query=${searchText}`);
        rebuild();
    });
    $("#advanced-mode").change(function() {
        if ($(this).prop("checked")) {
            $("#simple-sections").hide();
            $("#advanced-sections").show();
        } else {
            $("#advanced-sections").hide();
            $("#simple-sections").show();
        }
    }).trigger("change");  // ensure current state is respected on soft refresh

    $(".clear-query").on("click", reset);
    // set click event handlers for query elements
    $(".element-alternatives > .element").on("click", clickedElement);
    // and for the element buffet
    $(".domain-section .element").on("click", function (event) {
        const category = $(this).parent().attr("data-type");

        if (!category) {
            // shouldn't happen, but at least don't error out
            return;
        }
        const previous = $(`.section-elements[data-type='${category}'] > .element-alternatives:nth-last-child(2)`);
        // if ctrl down, append to most recent in same category (except if the clicked thing is NONE, and maybe not )
        if (event.ctrlKey || event.metaKey) {
            if (category === "S") {
                showError("Condensation step cannot have two domains in an alternative group");
                return;
            }
            if (category === "L") {
                showError("Substrate activation cannot have two domains in an alternative group");
                return;
            }
            if (category === "T") {
                showError("Carrier protein cannot have two domains in an alternative group");
                return;
            }
            if (category === "F") {
                showError("Epimerase/finalisation cannot have two domains in an alternative group");
                return;
            }
            // TODO: abort if text already inside list
            // TODO: replace "ignore" if in existing
            // abort if None is selected and the existing is anything other than "ignored"
            if ($(this).text().trim() === "none") {
                if (previous.children().last().text().trim() !== "ignored") {
                    showError("cannot require none and other types");
                    return;  // TODO: alert the user that it's incompatible
                } else {
                    previous.children().remove();
                    previous.removeClass("empty-alternatives");
                }
            }
            $(`<div class="element">${$(this)[0].outerHTML}</div>`).appendTo(previous).on("click", clickedElement);
            $(CLASSNAME).sortable("refreshPositions");
        } else { // else create alternative
            const newAlternative = $(`<div class="element-alternatives"><div class="element">${$(this)[0].outerHTML}</div></div>`).sortable(SORTSTUFF);
            newAlternative.insertAfter(previous);
            // replace other "ignore" element-alternatives that exist
            if (previous.children() && previous.children().last().hasClass("element-ignore")) {
                previous.remove();
            }
            newAlternative.children().on("click", clickedElement);
        }
        updateSearchText();
    });
}
