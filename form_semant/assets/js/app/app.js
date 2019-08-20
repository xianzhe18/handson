/**
 * Created by Steel on 12/21/2017.
 */
;(function(){
    var vendors, categories, markets, influencers, currencies, paymentProfiles;

    var dateRangePickerOption = {
        format: 'YYYY-MM-DD',
        "ranges": {
            "This Month": [moment().startOf('month'), moment().endOf('month')],
            "Last Month": [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
            "Next Month": [moment().add(1, 'month').startOf('month'), moment().add(1, 'month').endOf('month')]
        }
    };
//////////////////////////////////////////////////////// Semantic Modules /////////////////////////////////////////

    $.getJSON("data/vendors.json").done(function(data){
        vendors = data;
        $.getJSON("data/influencers.json").done(function(data){
            influencers = data;
            $('#vendor-search').search({
                source: $.merge(vendors, influencers)
            });
        })
    });

    $.getJSON("data/markets.json").done(function(data){
        markets = data;
        $('.market-search').search({
            source: markets
        });
    });

    $.getJSON("data/payment_profiles.json").done(function(data){
        paymentProfiles = data;
        $('#payment-profile-dropdown').dropdown({
            values: paymentProfiles
        });
    });

    $('.ui.styled.accordion').accordion();

    $('.ui.checkbox').checkbox();

    $('.ui.calendar.date').calendar({
        type: 'date'
    }).popup();

    $('#currency-units-dropdown').dropdown();
    $('#allocation-currency-units-dropdown').dropdown();

    $('.allocation-period-input').daterangepicker(dateRangePickerOption);

    $('#popup-btn').popup({
        popup : $('.custom.popup'),
        inline: true,
        on    : 'click'
    });

//////////////////////////////////////////////////// Event Handlers /////////////////////////////////////////////

    $('#preview-btn').on("click", function(){
        var result = {
            "vendor": $('#vendor-input').val(),
            "amount": $('#amount-input').val(),
            "currency": $('#currency-unit').text(),
            "invoice": $('#invoice-input').val(),
            "date": $('#invoice-date-input').val(),
            "invoice_reference": $('#invoice-reference-input').val(),
            "due_date": $('#payment-due-input').val(),
            "allocation": $('input[name="allocation-method"]:checked').val(),
            "market": $('#market-search-input').val(),
            "allocation_period": $('#allocation-period-input').val()
        };
        alert(JSON.stringify(result));
    });

    $('#payee-add-btn').on("click", function(){
        var data = {
            "name": $('#payee-name').val(),
            "address": $('#payee-address').val(),
            "detail": $('#payment-details').val(),
            "category": $('#payment-category').text()
        };

        if (data.name == ""){
            $('#payee-name').focus();
            return false;
        }
        if (data.category == "Payment Profile"){
            $('#payment-category').click();
            return false;
        }

        if (data.category.indexOf("influencer") > -1){
            $.merge(influencers, [{title: data.name}]);
            $.ajax({
                url: "action.php",
                type: "POST",
                data: {
                    "action": "add-influencer",
                    "data": {"title": data.name}
                }
            });
        } else {
            $.merge(vendors, [{title: data.name}]);
            $.ajax({
                url: "action.php",
                type: "POST",
                data: {
                    "action": "add-vendor",
                    "data": {"title": data.name}
                }
            });
        }
        $('#vendor-search').search({
            source: $.merge(vendors, influencers)
        });
        $('body').click();
    });

    $('#amount-input').on("change", validateAllocationAmount);

    $('#upload-btn').on("click", function(){
        $('#file-input').click();
    });

    $('#simple-allocation-check').on("change", function(){
        if ($(this).prop("checked")){
            $("#simple-allocation-panel").hide();
            $("#complex-allocation-panel").show();
        } else {
            $("#simple-allocation-panel").show();
            $("#complex-allocation-panel").hide();
        }
    });

    $('.currency-unit-menu').on("click", function(){
        $('.currency-unit').text($(this).parent().find('.currency-unit').text());
    });

    $('#complex-allocation-panel').delegate(".add-row-btn", "click", function(){
        if ($('.allocation-row').length >= 5) return false;

        var allocation_row = '<div class="ui grid allocation-row">' +
            '<div class="four wide column">' +
            '<div class="ui search market-search">' +
            '<div class="ui icon input">' +
            '<input class="prompt rounded complex-market-search-input" type="text" placeholder="Market">' +
            '<i class="search icon"></i>' +
            '</div>' +
            '<div class="results"></div>' +
            '</div>' +
            '</div>' +
            '<div class="four wide column">' +
            '<div class="ui period">' +
            '<div class="ui input right icon">' +
            '<i class="calendar icon"></i>' +
            '<input type="text" class="allocation-period-input" placeholder="Allocation Period" />' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="four wide column">' +
            '<div class="ui right labeled input">' +
            '<div class="ui dropdown label allocation-currency-units-dropdown">' +
            '<div class="text currency-unit">' +
            $("#allocation-currency-unit").text() +
            '</div>' +
            '<i class="dropdown icon"></i>' +
            '<div class="menu">' +
            '</div>' +
            '</div>' +
            '<input type="text" class="one-allocation-amount" />' +
            '<div class="ui basic label">.00</div>' +
            '</div>' +
            '</div>' +
            '<div class="four wide column text-center">' +
            '<div class="ui icon button add-row-btn">' +
            '<i class="icon add square"></i>' +
            '</div>' +
            '</div>' +
            '</div>';

        $(allocation_row).insertAfter($(this).parents('.allocation-row'));

        $('.market-search').search({
            source: markets
        });

        $('.allocation-period-input').daterangepicker(dateRangePickerOption);

    }).delegate(".one-allocation-amount", "keyup", validateAllocationAmount).delegate("#total-allocation-amount", "keyup", validateAllocationAmount);
    //$('#date').bootstrapMaterialDatePicker({ weekStart : 0, time: false });
})();

function validateAllocationAmount(){
    var $totalObj = $('#total-allocation-amount'), items = $('.one-allocation-amount'), sum = 0;

    $.each(items, function(i, el){
        sum += +$(el).val();
    });

    $totalObj.val(sum);
    if ($("#amount-input").val() == sum){
        $totalObj.parent().removeClass("error");
        $("#allocation-confirm-btn").show();
    } else {
        $totalObj.parent().addClass("error");
        $("#allocation-confirm-btn").hide();
    }
}