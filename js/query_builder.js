function start() {
    $(".query-container").append(termTemplate);
    $(".example-button").click(setExample);
    $(".search-button").prop("disabled", false).click(runSearch);
    $(".load-more").click(runSearch);
    $(".stats-toggle").click(toggleStats);
    $(".remove-button").hide();
    $(".edit-search").click(function () {
        clearResults();
        $(".query-builder").show();
    });
    updateTermHandlers();
    $(".query-types .btn").click(function () {
        if ($(this).attr("data-type") === "cluster") {
            $(".gene-result-types").hide();
            $(".region-result-types").show();
        } else {
            $(".region-result-types").hide();
            $(".gene-result-types").show();
            if ($(this).attr("data-type") === "gene") {
                $(".gene-result-types .btn[data-type='fasta']").click();
            } else {
                $(".gene-result-types .btn[data-type='fastaa']").click();
            }
        }
    });
}

function updateTermHandlers() {
    $(".swap-button").off("click").click(swapTerms);
    $(".remove-button").off("click").click(removeTerm);
    $(".add-button").off("click").click(addTerm);
    $("select").off("change").change(selector);
    $(".btn-group").children().off("click").click(buttonClick);
}

function gatherOp(op) {
    var result = {
        'operation': op.find(".active").text().toLowerCase(),
        'term_type': 'op',
    };
    if (op.siblings().first().children().children(".list-group").length === 0) {
        result.left = gatherTerm(op.siblings().first().find(".term"));
    } else {
        result.left = gatherOp(op.siblings().first().find());
    }
    if (op.siblings().last().children().children(".list-group").length === 0) {
        result.right = gatherTerm(op.siblings().last().find(".term"));
    } else {
        result.right = gatherOp(op.siblings().last().find(".query-operation").first());
    }
    return result;
}

function gatherTerm(term) {
    return {
        "term_type": "expr",
        "category": term.find("select option:selected").attr("data-query"),
        "term": term.find("input").val(),
    };
}

function runSearch() {
    var top = $(".query-container").find(".list-group");
    if (top.length === 0) {
        var object = gatherTerm($(".term"));
    } else {
        var object = gatherOp($(".query-operation").first());
    }
    if (!object || !object.category && !object.left) {
        return;
    }
    var target = "search";
    var returnType = $(".region-result-types .active").attr("data-type");
    var searchType = $(".query-types .active").attr("data-type");

    if (returnType !== "json") {
        target = "export";
    } else if (searchType !== "cluster") {
        target = "export";
        returnType = $(".gene-result-types .active").attr("data-type");
    }
    $.ajax({
        method: 'post',
        url: `/api/v1.0/${target}`,
        data: JSON.stringify({
            query: {
               'return_type': returnType,
               'search': searchType,
               'terms': object,
            },
            offset: $(".query-builder").is(":visible") ? 0 : $(".load-more").attr("data-start")
        }),
        dataType: returnType === 'json' ? 'json' : 'text',
        contentType: 'application/json',
        processData: false,
        async: true,
        success: function (data, status, req) {
            if (!data || data.clusters && data.clusters.length === 0) {
                //TODO handle no results
                alert("no results");
            } else if (returnType === "json") {
                $(".query-builder").hide();
                showResults(data);
            } else {
                saveAs(new Blob([data], {type: `text/${returnType};charset=utf-8`}), "asdb_results." + returnType);
            }
        },
        error: function (data, status, req) {
            //TODO show 'an error occurred'
            console.log(status, data, req);
            alert("failed: " + status);
        }
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

function selector() {
    if ($(this).val() === "--- Select a category ---") {
        $(this).parent().next().find("input").prop("disabled", true).attr("placeholder", "select a category").val("");
    } else {
        $(this).parent().next().find("input").prop("disabled", false).attr("placeholder", "enter query term");
    }
}

function buttonClick() {
    $(this).addClass("active").siblings().removeClass("active");
}

function removeTerm() {
    var term = $(this).closest(".list-group-item");
    term.siblings(".query-operation").remove();
    var other = term.siblings(".list-group-item");
    var newParent = term.closest(".list-group").closest(".list-group-item");
    if (newParent.length === 0) {
        newParent = term.closest(".query-container");
    }
    var otherIsNested = other.find(".list-group").length > 0;
    other.detach();
    if (newParent.hasClass("query-container") && !otherIsNested) {
        // skip ul.list-group structures
        newParent.empty().append(other.find(".term").detach());
    } else if (otherIsNested) {
        newParent.empty().append(other.find(".list-group"));
    } else {
        newParent.empty().append(other.find(".term").parent().parent());
    }

    // cleanup redundancies
    $(".list-group-item").children(".list-group-item").each(function () {
        $(this).parent().append($(this).children().detach());
        $(this).remove();
    });

    var remainingButtons = $(".remove-button:visible"); // visible because remove was hiding first and timing was a problem
    if (remainingButtons.length === 1) {
        remainingButtons.hide();
    }
}

function swapTerms() {
    var op = $(this).parents(".query-operation").first();
    var term = op.siblings(".list-group-item").first();
    var other = op.siblings(".list-group-item").last();
    op.after(term);
    op.before(other);
}

function addTerm() {
    var term = $(this).closest(".list-group-item");
    if ($(".list-group").length === 0) {  // single row
        term = $(this).closest(".term");
        term.parent().append(newPair(true));
        term.detach();
        var newParent = $(".query-container").find("ul").first();
        $(".remove-button").show();
    } else if (term.next().hasClass("query-operation")) {
        term.parent().prepend(newPair());
        var newParent = term.siblings().first();
    } else {
        term.parent().append(newPair());
        var newParent = term.siblings().last();
    }
    newParent.find("select").first().val(term.find("select").val());
    newParent.find("input").first().prop("disabled", false).attr("placeholder", "enter query term").val(term.find("input").val());
    term.remove();
    updateTermHandlers();
}

function newPair(outer) {
    if (outer) {
        return `
        <ul class="list-group">
            ${newSingle()}
            ${opTemplate}
            ${newSingle()}
        </ul>
`;
    }
    return `
    <li class="list-group-item row">
        <div class="col-lg-10">
            <ul class="list-group">
                ${newSingle()}
                ${opTemplate}
                ${newSingle()}
            </ul>
        </div>
    </li>`;
}

function newSingle() {
    return `
<li class="list-group-item row">
    <div class="col-lg-10">
${termTemplate}
    </div>
${removeButtonTemplate}
</li>
`;
}

var removeButtonTemplate = `
    <div class="col-lg-2">
        <button class="remove-button btn btn-default">
            <i class="fa fa-trash"></i> Remove term
        </button>
    </div>
`;

var containerTemplate = `<ul class="list-group"></ul>`;

var opTemplate = `
    <li class="query-operation row">
        <div class="btn-group col-sm-4">
            <label class="btn btn-default">AND</label>
            <label class="btn btn-default active">OR</label>
            <label class="btn btn-default">EXCEPT</label>
        </div>
        <div class="col-sm-2 col-sm-offset-5">
            <button class="swap-button btn btn-default">
                <i class="fa fa-refresh"></i> Swap terms
            </button>
        </div>
    </li>`;

var termTemplate = `
        <div class="row term">
            <div class="col-sm-3">
                <select class="form-control">
                    <option label="--- Select a category ---" data-query="" selected="selected">--- Select a category ---</option>
                    <option label="NCBI RefSeq Accession" data-query="acc">NCBI RefSeq Accession</option>
                    <option label="NCBI assembly ID" data-query="assembly">NCBI assembly ID</option>
                    <optgroup label="antiSMASH predictions">
                        <option label="BGC type" data-query="type">BGC type</option>
                        <option label="Monomer" data-query="monomer">Monomer</option>
                        <option label="Biosynthetic profile" data-query="profile">Biosynthetic profile</option>
                        <option label="NRPS/PKS domain" data-query="asdomain">NRPS/PKS domain</option>
                        <option label="Terpene synthase type" data-query="terpene">Terpene synthase type</option>
                        <option label="Terpene cyclisation from carbon atom" data-query="terpenefromcarbon">Terpene cyclisation from carbon atom</option>
                        <option label="Terpene cyclisation to carbon atom" data-query="terpenetocarbon">Terpene cyclisation to carbon atom</option>
                        <option label="smCoG hit" data-query="smcog">smCoG hit</option>
                    </optgroup>
                    <optgroup label="Compound properties">
                        <option label="Compound sequence" data-query="compoundseq">Compound sequence</option>
                        <option label="RiPP Compound class" data-query="compoundclass">RiPP Compound class</option>
                    </optgroup>
                    <optgroup label="Quality filters">
                        <option label="Cluster on contig edge" data-query="contigedge">Cluster on contig edge</option>
                        <option label="Cluster with minimal predictions" data-query="minimal">Cluster with minimal predictions</option>
                    </optgroup>
                    <optgroup label="Taxonomy">
                        <option label="Strain" data-query="strain">Strain</option>
                        <option label="Species" data-query="species">Species</option>
                        <option label="Genus" data-query="genus">Genus</option>
                        <option label="Family" data-query="family">Family</option>
                        <option label="Order" data-query="order">Order</option>
                        <option label="Class" data-query="class">Class</option>
                        <option label="Phylum" data-query="phylum">Phylum</option>
                        <option label="Superkingdom" data-query="superkingdom">Superkingdom</option>
                    </optgroup>
                    <optgroup label="Similar clusters">
                        <option label="ClusterBlast hit" data-query="clusterblast">ClusterBlast hit</option>
                        <option label="KnownClusterBlast hit" data-query="knowncluster">KnownClusterBlast hit</option>
                        <option label="SubClusterBlast hit" data-query="subcluster">SubClusterBlast hit</option>
                    </optgroup>
                </select>
            </div>
            <div class="col-sm-4">
                <input type="text" class="form-control" placeholder="select a category" disabled="disabled">
                <ul class="dropdown-menu" role="listbox">
                </ul>
            </div>
            <div class="col-sm-1 col-sm-offset-3">
                <button class="add-button btn btn-default">
                    <i class="fa fa-plus"></i> Add term
                </button>
            </div>
        </div>`;
