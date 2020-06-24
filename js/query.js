function start() {
    $(".example-button").click(setExample);
    $(".search-button").click(runSearch);
    $(".load-more").click(runSearch);
    $(".stats-toggle").click(toggleStats);
    $(".remove-button").hide();
    $(".edit-search").click(function () {
        clearResults();
        $(".query-builder").show();
    });
}

function runSearch() {
    $.ajax({
        method: 'post',
        url: "/api/v1.0/search",
        data: JSON.stringify({
            search_string: $("#search-string").text(),
            offset: $(".query-builder").is(":visible") ? 0 : $(".load-more").attr("data-start")
        }),
        dataType: 'json',
        contentType: 'application/json',
        processData: false,
        async: true,
        success: function (data, status, req) {
            if (data.clusters && data.clusters.length === 0) {
                //TODO handle no results
            } else {
                // TODO if region search type
                $(".query-builder").hide();
                showResults(data);
                //TODO FASTA
                //TODO CSV
            }
        },
        error: function (data, status, req) {
            //TODO show 'an error occurred'
            console.log("ignoring error");
    });
    // TODO show "Searching, please wait..."
}

function setExample() {
    var container = $(".query-container");
    container
        .empty()
        .append(newPair(true))
        .children().last().find(".add-button").last().click(addTerm).click();

    updateTermHandlers();

    container.find(".btn-group").children().first().click();

    container.find("select").val("Genus").first().val("BGC type");

    var text = ["ripp", "Streptomyces", "Lactococcus"];
    container.find("input").prop("disabled", false).attr("placeholder", "enter query term").each(function (index) {
        $(this).val(text[index]);
    });
}
